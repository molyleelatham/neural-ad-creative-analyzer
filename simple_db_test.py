#!/usr/bin/env python3
"""
Simple database connection test script
Update the DATABASE_URL below with your full Render connection string
"""

import asyncio
import sys
import os
from pathlib import Path

# UPDATE THIS WITH YOUR FULL RENDER DATABASE URL
DATABASE_URL = "postgresql://arcanalytic_user:48V2PvzYivRLN1B2LUeCwrZFtNVU7GKJ@dpg-d7ml24e7r5hc73895v50-a.oregon.postgres.render.com/arcanalytic"

async def test_connection():
    """Test database connection"""
    print("🔍 Testing database connection...")
    print(f"   URL: {DATABASE_URL}")
    
    # Set environment variable
    os.environ["DATABASE_URL"] = DATABASE_URL
    os.environ["ENVIRONMENT"] = "production"
    
    try:
        # Add backend to path
        backend_dir = Path(__file__).parent / "backend"
        sys.path.insert(0, str(backend_dir))
        
        from database import DatabaseManager
        
        # Test connection
        db = DatabaseManager()
        await db.initialize()
        print("✅ Database connection successful!")
        
        # Get database info
        async with db.get_connection() as conn:
            version = await conn.fetchval("SELECT version()")
            print(f"📊 PostgreSQL version: {version}")
            
            # Check tables
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            print(f"📋 Found {len(tables)} tables:")
            for table in tables:
                print(f"   - {table['table_name']}")
        
        await db.close()
        
        # Ask to run migration
        response = input("\n🚀 Run migration? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            await run_migration()
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Verify the full database URL from Render Dashboard")
        print("   2. Check if database is in 'Live' status")
        print("   3. Ensure external connections are allowed")
        print("   4. Check network connectivity")

async def run_migration():
    """Run database migration"""
    print("\n🚀 Running migration...")
    
    try:
        from database import DatabaseManager
        
        # Read schema
        schema_path = Path(__file__).parent / "database" / "schema.sql"
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        db = DatabaseManager()
        await db.initialize()
        
        async with db.get_connection() as conn:
            for i, statement in enumerate(statements, 1):
                if statement and not statement.startswith('--'):
                    try:
                        await conn.execute(statement)
                        print(f"  ✅ Statement {i}")
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            print(f"  ⚠️  Statement {i}: Already exists")
                        else:
                            print(f"  ❌ Statement {i}: {e}")
                            return False
        
        print("✅ Migration completed!")
        
        # Show results
        async with db.get_connection() as conn:
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            print(f"\n📋 Created {len(tables)} tables:")
            for table in tables:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {table['table_name']}")
                print(f"   ✅ {table['table_name']} ({count} rows)")
        
        await db.close()
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())