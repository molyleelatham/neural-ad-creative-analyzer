#!/usr/bin/env python3
"""
Database migration script for ArcAnalytics on Render
Run this script to set up the database schema and initial data
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import DatabaseManager


async def run_migrations():
    """Run database migrations"""
    print("🚀 Starting ArcAnalytics database migration...")
    
    try:
        # Initialize database connection
        db = DatabaseManager()
        await db.initialize()
        print("✅ Database connection established")
        
        # Read and execute schema
        schema_path = Path(__file__).parent.parent / "database" / "schema.sql"
        if not schema_path.exists():
            print(f"❌ Schema file not found: {schema_path}")
            return False
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Split schema into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        print(f"📝 Executing {len(statements)} SQL statements...")
        
        async with db.get_connection() as conn:
            for i, statement in enumerate(statements, 1):
                if statement and not statement.startswith('--'):
                    try:
                        await conn.execute(statement)
                        print(f"  ✅ Statement {i}: Executed successfully")
                    except Exception as e:
                        # Ignore errors for statements that might already exist
                        if "already exists" in str(e).lower() or "duplicate key" in str(e).lower():
                            print(f"  ⚠️  Statement {i}: Already exists - skipping")
                        else:
                            print(f"  ❌ Statement {i}: Error - {e}")
                            print(f"     SQL: {statement[:100]}...")
                            return False
        
        print("✅ Database schema created successfully")
        
        # Insert sample data if in development
        if os.getenv("ENVIRONMENT", "development").lower() == "development":
            print("🌱 Inserting sample development data...")
            await insert_sample_data(db)
            print("✅ Sample data inserted")
        
        await db.close()
        print("🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


async def insert_sample_data(db: DatabaseManager):
    """Insert sample data for development"""
    from database import OrganizationCreate, CampaignCreate, UserCreate
    
    async with db.get_connection() as conn:
        # Insert sample organizations
        orgs = [
            {"name": "Acme Cosmetics", "slug": "acme-cosmetics"},
            {"name": "Tech Startup Inc", "slug": "tech-startup-inc"},
            {"name": "Global Retail Corp", "slug": "global-retail-corp"}
        ]
        
        for org_data in orgs:
            try:
                await conn.execute("""
                    INSERT INTO organizations (name, slug) 
                    VALUES ($1, $2) 
                    ON CONFLICT (slug) DO NOTHING
                """, org_data["name"], org_data["slug"])
            except Exception:
                pass  # Ignore if already exists
        
        # Insert sample industry benchmarks
        benchmarks = [
            {
                "industry": "cosmetics", "objective": "purchase", "audience_segment": "premium_brand_oriented",
                "purchase_mean": 75.5, "purchase_std": 12.3, "engagement_mean": 82.1, "engagement_std": 10.8,
                "sample_size": 1250
            },
            {
                "industry": "technology", "objective": "engagement", "audience_segment": "social_proof_driven",
                "purchase_mean": 68.2, "purchase_std": 15.6, "engagement_mean": 79.3, "engagement_std": 12.1,
                "sample_size": 890
            },
            {
                "industry": "retail", "objective": "clarity", "audience_segment": "budget_sensitive",
                "purchase_mean": 71.8, "purchase_std": 11.2, "engagement_mean": 76.4, "engagement_std": 13.5,
                "sample_size": 2100
            }
        ]
        
        for benchmark in benchmarks:
            try:
                await conn.execute("""
                    INSERT INTO industry_benchmarks (
                        industry, objective, audience_segment, purchase_mean, purchase_std,
                        engagement_mean, engagement_std, sample_size
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (industry, objective, audience_segment) DO NOTHING
                """, benchmark["industry"], benchmark["objective"], benchmark["audience_segment"],
                      benchmark["purchase_mean"], benchmark["purchase_std"], benchmark["engagement_mean"],
                      benchmark["engagement_std"], benchmark["sample_size"])
            except Exception:
                pass  # Ignore if already exists


async def verify_database():
    """Verify database setup by checking key tables"""
    print("🔍 Verifying database setup...")
    
    db = DatabaseManager()
    await db.initialize()
    
    try:
        async with db.get_connection() as conn:
            # Check if key tables exist
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            table_names = [row["table_name"] for row in tables]
            expected_tables = [
                "organizations", "users", "campaigns", "analyses", "variants",
                "visual_scores", "visual_segments", "brain_analysis", "comparisons",
                "industry_benchmarks", "usage_logs", "monthly_usage"
            ]
            
            print("📋 Database tables:")
            for table in expected_tables:
                if table in table_names:
                    print(f"  ✅ {table}")
                else:
                    print(f"  ❌ {table} - MISSING")
            
            # Check row counts
            print("\n📊 Table row counts:")
            for table in expected_tables:
                if table in table_names:
                    count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                    print(f"  {table}: {count} rows")
        
        print("✅ Database verification completed")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        await db.close()


async def reset_database():
    """Reset database (DANGEROUS - only for development)"""
    if os.getenv("ENVIRONMENT", "development").lower() != "development":
        print("❌ Database reset only allowed in development environment")
        return False
    
    confirm = input("⚠️  This will delete ALL data. Are you sure? (type 'RESET' to confirm): ")
    if confirm != "RESET":
        print("❌ Reset cancelled")
        return False
    
    print("🔄 Resetting database...")
    
    db = DatabaseManager()
    await db.initialize()
    
    try:
        async with db.get_connection() as conn:
            # Drop all tables
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            
            for row in tables:
                table_name = row["table_name"]
                await conn.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                print(f"  🗑️  Dropped {table_name}")
        
        print("✅ Database reset completed")
        
        # Re-run migrations
        await run_migrations()
        
    except Exception as e:
        print(f"❌ Reset failed: {e}")
        return False
    finally:
        await db.close()
    
    return True


def main():
    """Main migration script entry point"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python migrate.py migrate    # Run migrations")
        print("  python migrate.py verify     # Verify database setup")
        print("  python migrate.py reset      # Reset database (dev only)")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "migrate":
        success = asyncio.run(run_migrations())
    elif command == "verify":
        asyncio.run(verify_database())
        return
    elif command == "reset":
        success = asyncio.run(reset_database())
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()