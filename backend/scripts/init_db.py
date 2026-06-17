#!/usr/bin/env python3
"""
Database initialization script
Run this script to create the database tables and initial data
"""

import asyncio
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent))

from backend.app.core.database import local_engine, Base, async_local_session_maker
from backend.app.repositories.user import UserCRUD
from backend.app.schemas.users import UserCreate

async def create_tables():
    """Create all database tables"""

    import backend.app.models  # noqa: F401

    print("Creating database tables...")
    async with local_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully!")

async def create_admin_user():
    """Create a default admin user"""
    print("Creating default admin user...")
    
    async with async_local_session_maker() as db:
        # Check if admin user already exists
        existing_admin = await UserCRUD.get_user_by_username(db, "admin")
        if existing_admin:
            print("✅ Admin user already exists!")
            return
        
        # Create admin user
        admin_data = UserCreate(
            username="admin",
            name_full="System Administrator",
            email="admin@example.com",
            password="admin123",  # Change this in production!
            enabled=True,
            role_id="admin"
        )
        
        admin_user = await UserCRUD.create_user(db, admin_data)
        print(f"✅ Admin user created successfully!")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Role: {admin_user.role_id}")
        print("   ⚠️  Please change the default password in production!")

async def main():
    """Main initialization function"""
    print("🚀 Starting database initialization...")
    
    try:
        # Create tables
        await create_tables()
        
        # Create admin user
        await create_admin_user()
        
        print("✅ Database initialization completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during database initialization: {e}")
        sys.exit(1)
    
    finally:
        await local_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
