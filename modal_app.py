"""Modal deployment for TRIBE v2 brain encoding model.

Exposes three HTTP endpoints:
  POST /predict-text   — body: {"text": "..."}
  POST /predict-audio  — body: {"file_b64": "<base64>", "filename": "audio.wav"}
  POST /predict-video  — body: {"file_b64": "<base64>", "filename": "video.mp4"}

All endpoints return:
  {"predictions": [[...], ...], "shape": [n_timesteps, n_vertices]}

Setup (one-time):
  1. pip install modal
  2. modal setup                          # authenticate
  3. modal secret create huggingface-secret HUGGING_FACE_HUB_TOKEN=hf_...
     (token must have access to meta-llama/Llama-3.2-3B)
  4. modal deploy modal_app.py            # deploy to cloud
     OR
     modal run modal_app.py              # local test run

The model (~1 GB) is downloaded from HuggingFace on first run and cached in
a Modal Volume so subsequent cold starts are fast.
"""

import base64
import os
import tempfile
from pathlib import Path

import modal

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = modal.App("tribev2")

# ---------------------------------------------------------------------------
# Image — install tribev2 and system deps
# ---------------------------------------------------------------------------

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["ffmpeg", "git"])
    # uv provides `uvx` which is used by ExtractWordsFromAudio (whisperx)
    .pip_install(["uv"])
    .run_commands(
        "uv pip install --system "
        "'tribev2[training] @ git+https://github.com/facebookresearch/tribev2.git'"
    )
    # Pin NumPy to <2.1 after tribev2 installs its preferred version.
    # Some downstream deps (nilearn, pyvista) break on NumPy >=2.1.
    .run_commands("uv pip install --system 'numpy<2.1'")
)

# ---------------------------------------------------------------------------
# Persistent storage
# ---------------------------------------------------------------------------

# HuggingFace model weights (tribev2 ~1 GB, LLaMA ~6 GB, whisperx models, etc.)
hf_cache_vol = modal.Volume.from_name("tribev2-hf-cache", create_if_missing=True)

# Feature-extraction cache (avoids recomputing audio/video/text features for
# identical inputs) and experiment output folder required by TribeExperiment.
feature_cache_vol = modal.Volume.from_name("tribev2-feature-cache", create_if_missing=True)

HF_CACHE_DIR = "/hf-cache"
FEATURE_CACHE_DIR = "/feature-cache"
XP_FOLDER = f"{FEATURE_CACHE_DIR}/xp"

# ---------------------------------------------------------------------------
# Model class
# ---------------------------------------------------------------------------

@app.cls(
    # A10G has 24 GB VRAM — sufficient for inference.
    # Upgrade to gpu="A100" if you hit OOM during video feature extraction.
    gpu="A10G",
    image=image,
    volumes={
        HF_CACHE_DIR: hf_cache_vol,
        FEATURE_CACHE_DIR: feature_cache_vol,
    },
    # huggingface-secret must expose HUGGING_FACE_HUB_TOKEN
    # (required for meta-llama/Llama-3.2-3B)
    secrets=[modal.Secret.from_name("huggingface-secret")],
    # Allow up to 10 min for a single inference call (long videos take time)
    timeout=600,
    # Keep container alive for 5 min between requests to avoid cold starts
    container_idle_timeout=300,
)
class TribeApp:
    """Wraps TribeModel for Modal deployment."""

    @modal.enter()
    def load_model(self):
        os.environ["HF_HOME"] = HF_CACHE_DIR
        # Give HuggingFace 5 min per file — large models (LLaMA ~6 GB) time out
        # on slow connections with the default 10 s timeout.
        os.environ["HF_HUB_DOWNLOAD_TIMEOUT"] = "300"

        Path(XP_FOLDER).mkdir(parents=True, exist_ok=True)

        # Pre-download LLaMA weights into the volume before from_pretrained()
        # so the first predict() call doesn't block on a slow download mid-run.
        # Import is local — huggingface_hub is a tribev2 dep, not installed locally.
        from huggingface_hub import snapshot_download  # type: ignore[import]
        snapshot_download("meta-llama/Llama-3.2-3B", cache_dir=HF_CACHE_DIR)

        from tribev2 import TribeModel

        self.model = TribeModel.from_pretrained(
            "facebook/tribev2",
            cache_folder=FEATURE_CACHE_DIR,
            config_update={"infra.folder": XP_FOLDER},
        )
        self._cache: dict = {}

    # ------------------------------------------------------------------
    # Internal helper
    # ------------------------------------------------------------------

    def _predict(self, events) -> dict:
        import hashlib
        key = hashlib.md5(events.to_json().encode()).hexdigest()
        if key in self._cache:
            return self._cache[key]
        preds, _ = self.model.predict(events=events, verbose=False)
        result = {
            "predictions": preds.tolist(),
            "shape": list(preds.shape),
            "n_timesteps": int(preds.shape[0]),
            "n_vertices": int(preds.shape[1]),
        }
        self._cache[key] = result
        return result

    def _write_temp(self, data: bytes, suffix: str) -> str:
        """Write bytes to temp file, flushing all the way to disk before returning."""
        f = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
        f.close()
        return f.name

    # ------------------------------------------------------------------
    # Web endpoints
    # ------------------------------------------------------------------

    @modal.web_endpoint(method="POST", label="predict-text")
    def predict_text(self, body: dict) -> dict:
        """Predict brain responses from text.

        Body JSON: {"text": "To be or not to be..."}
        The text is synthesised to speech (gTTS), transcribed back to
        word-level events, then fed to the model.
        """
        text = body.get("text", "")
        if not text.strip():
            return {"error": "text field is empty"}

        path = self._write_temp(text.encode(), ".txt")
        try:
            events = self.model.get_events_dataframe(text_path=path)
            return self._predict(events)
        finally:
            os.unlink(path)

    @modal.web_endpoint(method="POST", label="predict-audio")
    def predict_audio(self, body: dict) -> dict:
        """Predict brain responses from an audio file.

        Body JSON:
          {
            "file_b64": "<base64-encoded audio bytes>",
            "filename": "recording.wav"   # determines format; default: audio.wav
          }
        Supported formats: .wav  .mp3  .flac  .ogg
        """
        file_b64 = body.get("file_b64")
        if not file_b64:
            return {"error": "file_b64 is required"}

        data = base64.b64decode(file_b64)
        suffix = Path(body.get("filename", "audio.wav")).suffix or ".wav"
        path = self._write_temp(data, suffix)
        try:
            events = self.model.get_events_dataframe(audio_path=path)
            return self._predict(events)
        finally:
            os.unlink(path)

    @modal.web_endpoint(method="POST", label="predict-video")
    def predict_video(self, body: dict) -> dict:
        """Predict brain responses from a video file.

        Body JSON:
          {
            "file_b64": "<base64-encoded video bytes>",
            "filename": "clip.mp4"   # determines format; default: video.mp4
          }
        Supported formats: .mp4  .avi  .mkv  .mov  .webm
        Audio is extracted automatically; speech is transcribed to get
        word-level text events alongside the visual and audio features.
        """
        file_b64 = body.get("file_b64")
        if not file_b64:
            return {"error": "file_b64 is required"}

        data = base64.b64decode(file_b64)
        suffix = Path(body.get("filename", "video.mp4")).suffix or ".mp4"
        path = self._write_temp(data, suffix)
        try:
            events = self.model.get_events_dataframe(video_path=path)
            return self._predict(events)
        finally:
            os.unlink(path)


# ---------------------------------------------------------------------------
# Local entrypoint — quick sanity check without deploying
# ---------------------------------------------------------------------------

@app.local_entrypoint()
def main():
    """Runs a quick text prediction test.

    Usage:
        modal run modal_app.py
    """
    sample_text = (
        "To be or not to be, that is the question. "
        "Whether tis nobler in the mind to suffer "
        "the slings and arrows of outrageous fortune."
    )

    print("Running text prediction test...")
    tribe = TribeApp()
    result = tribe.predict_text.remote({"text": sample_text})
    print(f"Predictions shape: {result['shape']}")
    print(f"n_timesteps={result['n_timesteps']}, n_vertices={result['n_vertices']}")
