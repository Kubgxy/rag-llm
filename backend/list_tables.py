import asyncio
import sys

sys.path.append(r"c:\my-project\rag-llm\backend")

async def main():
    from app.database import engine
    from sqlalchemy import text
    async with engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        ))
        rows = result.fetchall()
        print("Existing tables:")
        for r in rows:
            print(f"- {r[0]}")

if __name__ == "__main__":
    asyncio.run(main())
