#!/usr/bin/env python3
"""
Database connection test script for ArcAnalytics
Helps debug DATABASE_URL and connection issues
"""

import os
import asyncio
import sys
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded .env file")
except ImportError:
    # If python-dotenv is not available, manually load .env
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        print("📁 Loading .env file manually...")
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print("✅ Loaded .env file manually")
    else:
        print("⚠️  .env file not found")

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

async def test_database_connection():
    """Test database connection with detailed logging"""
    
    print("🔍 ArcAnalytics Database Connection Test")
    print("=" * 50)
    
    # Check environment variables
    print("\n📋 Environment Variables:")
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL: NOT SET")
        print("\n🔧 To fix this:")
        print("1. Copy .env.example to .env")
        print("2. Update DATABASE_URL in .env with your PostgreSQL connection string")
        print("3. Restart the application")
        return False
    
    print(f"✅ DATABASE_URL: {database_url.split('@')[0]}@***")
    
    # Validate format
    if not database_url.startswith(('postgresql://', 'postgres://')):
        print(f"❌ Invalid format: {database_url[:30]}...")
        print("🔧 Must start with 'postgresql://' or 'postgres://'")
        return False
    
    print("✅ Format: Valid")
    
    # Test actual connection
    print("\n🔌 Testing database connection...")
    try:
        from backend.database import DatabaseConfig, DatabaseManager
        
        config = DatabaseConfig()
        db_manager = DatabaseManager(config)
        
        await db_manager.initialize()
        print("✅ Connection successful!")
        
        # Test a simple query
        async with db_manager.get_connection() as conn:
            result = await conn.fetchval("SELECT 1 as test")
            if result == 1:
                print("✅ Query test passed!")
            else:
                print(f"❌ Query test failed: {result}")
                return False
        
        await db_manager.close()
        print("✅ Connection closed properly")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n🔧 Common fixes:")
        print("1. Check if database server is running")
        print("2. Verify username/password in DATABASE_URL")
        print("3. Ensure database name exists")
        print("4. Check network connectivity/firewall")
        print("5. Verify SSL settings if required")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_database_connection())
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Database connection test PASSED")
        sys.exit(0)
    else:
        print("💥 Database connection test FAILED")
        sys.exit(1)