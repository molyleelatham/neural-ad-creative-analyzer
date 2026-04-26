#!/usr/bin/env python3
"""
Pydantic AI LLM Evaluation Tool for ArcAnalytics

This script tests and evaluates the LLM integration in the analysis pipeline.
It provides detailed context about what data is sent to the LLM and how responses are structured.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.append(str(Path(__file__).parent / "backend"))

from backend.agents.pydantic_ai_narrative import (
    enrich_comparison_narrative,
    _llm_credentials_present,
    _demo_mode_enabled,
    _resolve_model_name,
    CompareNarrative
)
from backend.models.schemas import CampaignObjective, AudienceSegment


def create_test_variant_data():
    """Create realistic test variant data for LLM evaluation."""
    
    # Test single variant data
    single_variant = {
        "variant_id": "variant_A",
        "filename": "ad_creative_test.jpg",
        "scores": {
            "purchase": 78.5,
            "engagement": 82.3,
            "virality": 71.2,
            "clarity": 85.7
        },
        "neural_features": {
            "attention_score": 88.4,
            "emotional_intensity": 76.9,
            "memory_encoding": 81.2,
            "p_convert_peak": 79.6
        },
        "segments": [
            {
                "label": "headline_text",
                "confidence": 0.92,
                "visual_weight_pct": 18.5,
                "pillar": "Clarity"
            },
            {
                "label": "cta_button",
                "confidence": 0.87,
                "visual_weight_pct": 12.3,
                "pillar": "Urgency"
            },
            {
                "label": "product_shot",
                "confidence": 0.94,
                "visual_weight_pct": 28.7,
                "pillar": "Trust"
            },
            {
                "label": "brand_logo",
                "confidence": 0.89,
                "visual_weight_pct": 8.2,
                "pillar": "Trust"
            },
            {
                "label": "person_face",
                "confidence": 0.85,
                "visual_weight_pct": 15.4,
                "pillar": "Emotion"
            }
        ],
        "pillar_scores": {
            "Attention": 82.1,
            "Trust": 74.8,
            "Urgency": 68.9,
            "Clarity": 85.7,
            "Emotion": 79.3
        }
    }
    
    # Test comparison variant data
    variant_b = {
        **single_variant,
        "variant_id": "variant_B",
        "filename": "ad_creative_variant_b.jpg",
        "scores": {
            "purchase": 72.1,
            "engagement": 88.9,
            "virality": 85.4,
            "clarity": 76.3
        },
        "neural_features": {
            "attention_score": 91.2,
            "emotional_intensity": 84.7,
            "memory_encoding": 77.8,
            "p_convert_peak": 74.2
        }
    }
    
    return single_variant, variant_b


async def evaluate_llm_single_ad():
    """Test LLM with single ad analysis."""
    print("\n" + "="*60)
    print("🧠 TESTING LLM - SINGLE AD ANALYSIS")
    print("="*60)
    
    variant_a, _ = create_test_variant_data()
    
    # Show what data is sent to LLM
    payload = {
        "mode": "single",
        "objective": "purchase",
        "audience_segment": "premium_brand_oriented",
        "overall_winner": "variant_A",
        "objective_winner": "variant_A",
        "variants": [variant_a]
    }
    
    print("\n📤 DATA SENT TO LLM:")
    print(json.dumps(payload, indent=2))
    
    # Call LLM
    print(f"\n🤖 LLM Configuration:")
    print(f"  Credentials Present: {_llm_credentials_present()}")
    print(f"  Demo Mode: {_demo_mode_enabled()}")
    print(f"  Model: {_resolve_model_name() or 'None'}")
    
    print("\n⏳ Calling LLM...")
    try:
        result = await enrich_comparison_narrative(
            objective_value="purchase",
            audience_value="premium_brand_oriented",
            variants_payload=[variant_a],
            overall_winner="variant_A",
            objective_winner="variant_A"
        )
        
        if result:
            print("\n✅ LLM RESPONSE RECEIVED:")
            print(f"  Explanation: {result.explanation}")
            print(f"  Recommendations: {result.recommendations}")
            print(f"  Response Type: {type(result).__name__}")
            print(f"  Explanation Length: {len(result.explanation)} chars")
            print(f"  Recommendations Count: {len(result.recommendations)}")
        else:
            print("\n❌ LLM CALL FAILED - Using template fallback")
            
    except Exception as e:
        print(f"\n💥 LLM ERROR: {type(e).__name__}: {e}")


async def evaluate_llm_comparison():
    """Test LLM with A/B comparison analysis."""
    print("\n" + "="*60)
    print("🔄 TESTING LLM - A/B COMPARISON ANALYSIS")
    print("="*60)
    
    variant_a, variant_b = create_test_variant_data()
    
    # Show what data is sent to LLM
    payload = {
        "mode": "compare",
        "objective": "engagement",
        "audience_segment": "social_proof_driven",
        "overall_winner": "variant_B",
        "objective_winner": "variant_B",
        "variants": [variant_a, variant_b]
    }
    
    print("\n📤 DATA SENT TO LLM:")
    print(json.dumps(payload, indent=2))
    
    print("\n⏳ Calling LLM...")
    try:
        result = await enrich_comparison_narrative(
            objective_value="engagement",
            audience_value="social_proof_driven",
            variants_payload=[variant_a, variant_b],
            overall_winner="variant_B",
            objective_winner="variant_B"
        )
        
        if result:
            print("\n✅ LLM RESPONSE RECEIVED:")
            print(f"  Explanation: {result.explanation}")
            print(f"  Recommendations: {result.recommendations}")
            print(f"  Response Type: {type(result).__name__}")
            print(f"  Explanation Length: {len(result.explanation)} chars")
            print(f"  Recommendations Count: {len(result.recommendations)}")
        else:
            print("\n❌ LLM CALL FAILED - Using template fallback")
            
    except Exception as e:
        print(f"\n💥 LLM ERROR: {type(e).__name__}: {e}")


def analyze_llm_context():
    """Analyze the context and prompts given to the LLM."""
    print("\n" + "="*60)
    print("📝 LLM CONTEXT AND PROMPT ANALYSIS")
    print("="*60)
    
    print("\n🎯 LLM INSTRUCTIONS (from pydantic_ai_narrative.py):")
    instructions = (
        "You are an ad analytics strategist for Arcanalytics. "
        "You receive JSON with per-variant scores, mock neural features, and segment labels. "
        "If variants.length == 1, write a single-ad narrative (do NOT mention winners or comparisons). "
        "If variants.length >= 2, explain which variant wins for the stated objective and overall, referencing the numbers given. "
        "Do not invent new numeric scores. "
        "Recommendations must be short, actionable bullets for a marketing team. "
        "Never mention variants that are not present in the payload."
    )
    print(f"  {instructions}")
    
    print("\n📊 OUTPUT STRUCTURE (CompareNarrative):")
    print("  - explanation: string (min 20 chars)")
    print("  - recommendations: list[string] (2-8 items)")
    
    print("\n🔧 AVAILABLE DATA FOR LLM:")
    print("  - Variant scores (purchase, engagement, virality, clarity)")
    print("  - Neural features (attention, emotion, memory, conversion)")
    print("  - Visual segments with weights and pillars")
    print("  - Pillar scores (Attention, Trust, Urgency, Clarity, Emotion)")
    print("  - Campaign objective and audience segment")
    print("  - Overall/objective winners (for comparisons)")


def check_environment():
    """Check LLM environment configuration."""
    print("\n" + "="*60)
    print("🔧 ENVIRONMENT CONFIGURATION")
    print("="*60)
    
    print(f"\n🔑 API Keys:")
    print(f"  OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Missing'}")
    print(f"  GOOGLE_API_KEY: {'✅ Set' if os.getenv('GOOGLE_API_KEY') else '❌ Missing'}")
    
    print(f"\n⚙️ LLM Settings:")
    print(f"  PYDANTIC_AI_MODEL: {os.getenv('PYDANTIC_AI_MODEL', 'Not set')}")
    print(f"  ARCA_NARRATIVE_DEMO_MODE: {os.getenv('ARCA_NARRATIVE_DEMO_MODE', 'Not set')}")
    print(f"  GEMINI_MODEL: {os.getenv('GEMINI_MODEL', 'Not set (defaults to gemini-2.5-flash)')}")
    
    print(f"\n🎯 Model Resolution:")
    print(f"  Resolved Model: {_resolve_model_name() or 'None (no credentials)'}")
    print(f"  Credentials Present: {_llm_credentials_present()}")
    print(f"  Demo Mode: {_demo_mode_enabled()}")


async def main():
    """Run comprehensive LLM evaluation."""
    print("🧠 ArcAnalytics LLM Evaluation Tool")
    print("=" * 60)
    
    # Check environment
    check_environment()
    
    # Analyze context
    analyze_llm_context()
    
    # Test single ad
    await evaluate_llm_single_ad()
    
    # Test comparison
    await evaluate_llm_comparison()
    
    print("\n" + "="*60)
    print("📋 SUMMARY")
    print("="*60)
    print("\n💡 RECOMMENDATIONS:")
    
    if not _llm_credentials_present():
        print("  ❌ No LLM credentials found - Add OPENAI_API_KEY or GOOGLE_API_KEY to .env")
        print("  🧪 Current mode: Template-based recommendations only")
    elif _demo_mode_enabled():
        print("  🧪 Demo mode enabled - Using test model (no real LLM calls)")
        print("  💡 Set ARCA_NARRATIVE_DEMO_MODE=false to enable real LLM")
    else:
        print("  ✅ LLM properly configured - Real AI recommendations should be generated")
    
    print("\n📈 RECOMMENDATION SOURCES:")
    print("  🤖 AI-Generated: When LLM succeeds, provides contextual, narrative-style insights")
    print("  📋 Template-Based: When LLM fails, provides rule-based recommendations from visual analysis")
    print("  🔍 Template logic: Based on segment weights, CTA visibility, brand presence, etc.")
    
    print("\n🎯 TO IMPROVE LLM CONTEXT:")
    print("  1. Add more detailed product category information")
    print("  2. Include brand guidelines and voice preferences")
    print("  3. Add historical performance data")
    print("  4. Include competitive landscape context")
    print("  5. Add specific campaign goals and KPIs")


if __name__ == "__main__":
    asyncio.run(main())