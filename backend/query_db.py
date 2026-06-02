import asyncio
import sys
import os

# Enable UTF-8 console output for Windows to support emojis
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add backend directory to sys.path
sys.path.append(r"c:\my-project\rag-llm\backend")

async def main():
    print("Querying DB for documents...")
    try:
        from app.database import engine
        from sqlalchemy import text
        
        async with engine.connect() as conn:
            # Query documents
            result = await conn.execute(text("SELECT id, session_id, file_name, status, summary, created_at FROM documents;"))
            rows = result.fetchall()
            print(f"Total documents: {len(rows)}")
            for row in rows:
                print(f"ID: {row[0]}")
                print(f"  Session ID: {row[1]}")
                print(f"  File Name: {row[2]}")
                print(f"  Status: {row[3]}")
                print(f"  Summary: {row[4]}")
                print(f"  Created At: {row[5]}")
                print("-" * 50)
                
            # Query chat messages
            msg_result = await conn.execute(text("SELECT id, session_id, role, content, created_at FROM chat_messages;"))
            msg_rows = msg_result.fetchall()
            print(f"Total messages: {len(msg_rows)}")
            for row in msg_rows:
                print(f"ID: {row[0]}")
                print(f"  Session ID: {row[1]}")
                print(f"  Role: {row[2]}")
                print(f"  Content: {row[3]}")
                print(f"  Created At: {row[4]}")
                print("-" * 50)
                
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
