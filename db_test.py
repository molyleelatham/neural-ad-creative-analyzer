#!/usr/bin/env python3
"""
Quick database connection test and migration script
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Set database URL
os.environ["DATABASE_URL"] = "postgresql://arcanalytic_user:48V2PvzYivRLN1B2LUeCwrZFtNVU7GKJ@dpg-d7ml24e7r5hc73895v50-a/arcanalytic"
os.environ["ENVIRONMENT"] = "production"

async def test_connection():
    """Test database connection and run migration"""
    print("🔍 Testing database connection to Render PostgreSQL...")
    print(f"   Database: arcanalytic")
    print(f"   Host: dpg-d7ml24e7r5hc73895v50-a")
    
    try:
        from database import DatabaseManager
        
        # Initialize database
        db = DatabaseManager()
        await db.initialize()
        print("✅ Database connection successful!")
        
        # Test basic query
        async with db.get_connection() as conn:
            result = await conn.fetchval("SELECT version()")
            print(f"📊 PostgreSQL version: {result}")
            
            # Check if tables exist
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            if tables:
                print(f"📋 Found {len(tables)} existing tables:")
                for table in tables:
                    print(f"   - {table['table_name']}")
            else:
                print("📋 No tables found - will run migration")
        
        await db.close()
        
        # Ask user if they want to run migration
        response = input("\n🚀 Run database migration? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            await run_migration()
        else:
            print("✅ Connection test completed. Migration skipped.")
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n🔧 Possible solutions:")
        print("   1. Check if database is running on Render")
        print("   2. Verify connection string")
        print("   3. Check network connectivity")
        print("   4. Ensure database user has proper permissions")

async def run_migration():
    """Run database migration"""
    print("\n🚀 Starting database migration...")
    
    try:
        # Read and execute schema
        schema_path = Path(__file__).parent / "database" / "schema.sql"
        if not schema_path.exists():
            print(f"❌ Schema file not found: {schema_path}")
            return False
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Split schema into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        print(f"📝 Executing {len(statements)} SQL statements...")
        
        from database import DatabaseManager
        db = DatabaseManager()
        await db.initialize()
        
        async with db.get_connection() as conn:
            for i, statement in enumerate(statements, 1):
                if statement and not statement.startswith('--'):
                    try:
                        await conn.execute(statement)
                        print(f"  ✅ Statement {i}: Executed successfully")
                    except Exception as e:
                        if "already exists" in str(e).lower() or "duplicate key" in str(e).lower():
                            print(f"  ⚠️  Statement {i}: Already exists - skipping")
                        else:
                            print(f"  ❌ Statement {i}: Error - {e}")
                            return False
        
        print("✅ Database migration completed successfully!")
        
        # Verify tables were created
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

async def show_database_info():
    """Show database information and statistics"""
    print("📊 Database Information:")
    
    try:
        from database import DatabaseManager
        db = DatabaseManager()
        await db.initialize()
        
        async with db.get_connection() as conn:
            # Database info
            version = await conn.fetchval("SELECT version()")
            size = await conn.fetchval("SELECT pg_size_pretty(pg_database_size('arcanalytic'))")
            
            print(f"   Version: {version}")
            print(f"   Size: {size}")
            
            # Table info
            tables = await conn.fetch("""
                SELECT 
                    table_name,
                    pg_size_pretty(pg_total_relation_size(table_name)) as size
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            print(f"\n📋 Tables ({len(tables)} total):")
            for table in tables:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {table['table_name']}")
                print(f"   {table['table_name']}: {count} rows ({table['size']})")
        
        await db.close()
        
    except Exception as e:
        print(f"❌ Failed to get database info: {e}")

def main():
    """Main script entry point"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python db_test.py test       # Test database connection")
        print("  python db_test.py migrate    # Run database migration")
        print("  python db_test.py info       # Show database information")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "test":
        asyncio.run(test_connection())
    elif command == "migrate":
        asyncio.run(run_migration())
    elif command == "info":
        asyncio.run(show_database_info())
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()