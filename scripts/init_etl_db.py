#!/usr/bin/env python3
"""
ETL Database Initialization Script
Runs all PostgreSQL migrations for the ETL metadata schema
"""

import os
import sys
import psycopg2
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')  # type: ignore
    except AttributeError:
        pass

# Database configuration - can be overridden by environment variables
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "mellivora-mind-studio.ctgu40ug4of0.us-east-2.rds.amazonaws.com"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "zpGs6EZB3XQTbtNHZMvV"),
    "dbname": "postgres",  # Connect to default db first
    "sslmode": os.getenv("DB_SSLMODE", "require")
}

TARGET_DB = os.getenv("DB_NAME", "mellivora")


def get_connection(dbname=None):
    """Get database connection"""
    config = DB_CONFIG.copy()
    if dbname:
        config["dbname"] = dbname
    return psycopg2.connect(**config)


def create_database_if_not_exists():
    """Create the target database if it doesn't exist"""
    conn = get_connection()
    conn.autocommit = True
    cursor = conn.cursor()
    
    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{TARGET_DB}'")
    exists = cursor.fetchone()
    
    if not exists:
        print(f"Creating database '{TARGET_DB}'...")
        cursor.execute(f"CREATE DATABASE {TARGET_DB}")
        print(f"Database '{TARGET_DB}' created successfully")
    else:
        print(f"Database '{TARGET_DB}' already exists")
    
    cursor.close()
    conn.close()


def run_migrations():
    """Run all migration files"""
    migrations_dir = Path(__file__).parent.parent / "migrations" / "postgres"
    
    if not migrations_dir.exists():
        print(f"Migrations directory not found: {migrations_dir}")
        return False
    
    # Get all SQL files sorted by name
    sql_files = sorted(migrations_dir.glob("*.sql"))
    
    if not sql_files:
        print("No migration files found")
        return False
    
    print(f"Found {len(sql_files)} migration files")
    
    conn = get_connection(TARGET_DB)
    cursor = conn.cursor()
    
    for sql_file in sql_files:
        print(f"\nRunning migration: {sql_file.name}")
        try:
            sql_content = sql_file.read_text(encoding="utf-8")
            cursor.execute(sql_content)
            conn.commit()
            print(f"  ✓ {sql_file.name} completed")
        except psycopg2.errors.DuplicateObject as e:
            conn.rollback()
            print(f"  ⚠ {sql_file.name} skipped (already exists): {str(e).split(chr(10))[0]}")
        except psycopg2.errors.DuplicateTable as e:
            conn.rollback()
            print(f"  ⚠ {sql_file.name} skipped (table exists): {str(e).split(chr(10))[0]}")
        except Exception as e:
            conn.rollback()
            print(f"  ✗ {sql_file.name} failed: {e}")
            cursor.close()
            conn.close()
            return False
    
    cursor.close()
    conn.close()
    return True


def test_connection():
    """Test database connection and show some stats"""
    print("\n" + "=" * 50)
    print("Testing database connection...")
    
    try:
        conn = get_connection(TARGET_DB)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"✓ Connected to PostgreSQL")
        print(f"  Version: {version.split(',')[0]}")
        
        # Check ETL tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'etl_%'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print(f"\n✓ ETL tables found: {len(tables)}")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"  - {table[0]}: {count} rows")
        
        # Check plugins
        cursor.execute("SELECT COUNT(*) FROM etl_plugins")
        plugin_count = cursor.fetchone()[0]
        print(f"\n✓ Plugins registered: {plugin_count}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False


def main():
    print("=" * 50)
    print("Mellivora Mind Studio - ETL Database Initialization")
    print("=" * 50)
    
    # Step 1: Create database
    print("\n[1/3] Creating database...")
    try:
        create_database_if_not_exists()
    except Exception as e:
        print(f"✗ Failed to create database: {e}")
        sys.exit(1)
    
    # Step 2: Run migrations
    print("\n[2/3] Running migrations...")
    if not run_migrations():
        print("\n✗ Migration failed")
        sys.exit(1)
    
    # Step 3: Test connection
    print("\n[3/3] Testing connection...")
    if not test_connection():
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✓ Database initialization completed successfully!")
    print("=" * 50)
    
    # Print connection info for the service
    print("\nEnvironment variables for etl-config service:")
    print(f"  DB_HOST={DB_CONFIG['host']}")
    print(f"  DB_PORT={DB_CONFIG['port']}")
    print(f"  DB_USER={DB_CONFIG['user']}")
    print(f"  DB_PASSWORD={DB_CONFIG['password']}")
    print(f"  DB_NAME={TARGET_DB}")
    print(f"  DB_SSLMODE=require")


if __name__ == "__main__":
    main()
