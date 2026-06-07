import asyncio
import sys

sys.path.append(r"c:\my-project\rag-llm\backend")

async def main():
    from app.database import engine, Base, init_db
    from sqlalchemy import text
    
    print("Dropping all existing tables...")
    async with engine.begin() as conn:
        # We need to disable foreign key checks or drop tables in order
        await conn.execute(text("DROP TABLE IF EXISTS arena_votes CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS generated_actions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS chat_messages CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS documents CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS chat_sessions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS sync_history CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS system_sessions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS org_policies CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS data_test_shared_embeddings CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS data_document_embeddings_store CASCADE;"))
        
    print("All tables dropped.")
    
    print("Recreating all tables from models...")
    await init_db()
    print("Database schema successfully reset and initialized!")

if __name__ == "__main__":
    asyncio.run(main())
