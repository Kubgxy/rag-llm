import asyncio
import sys

sys.path.append(r"c:\my-project\rag-llm\backend")

async def main():
    from app.database import engine
    from sqlalchemy import text
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, system_session_id, sync_type, status, records_synced, error_message, started_at, completed_at FROM sync_history;"))
        rows = result.fetchall()
        print(f"Sync history count: {len(rows)}")
        for r in rows:
            print(f"ID: {r[0]}, Session: {r[1]}, Type: {r[2]}, Status: {r[3]}, Synced: {r[4]}, Error: {r[5]}, Started: {r[6]}, Completed: {r[7]}")
            
        res_session = await conn.execute(text("SELECT id, name, sync_status, last_synced_at FROM system_sessions;"))
        s_rows = res_session.fetchall()
        print(f"\nSystem Sessions:")
        for s in s_rows:
            print(f"ID: {s[0]}, Name: {s[1]}, Status: {s[2]}, Last Synced: {s[3]}")

if __name__ == "__main__":
    asyncio.run(main())
