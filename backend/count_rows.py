import asyncio
import sys

sys.path.append(r"c:\my-project\rag-llm\backend")

async def main():
    from app.database import engine
    from sqlalchemy import text
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT count(*) FROM data_document_embeddings_store;"))
        count = result.scalar()
        print(f"Total rows: {count}")

if __name__ == "__main__":
    asyncio.run(main())
