# -*- coding: utf-8 -*-
import asyncio
import sys

# Windows terminal UTF-8 encoding support
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.append(r"c:\my-project\rag-llm\backend")

async def test_run_small():
    print("Starting small sync engine test run...")
    try:
        from app.services.sync_engine import sync_engine
        
        # Monkeypatch fetch_with_retry to limit the records fetched to 3
        original_fetch = sync_engine.fetch_with_retry
        
        async def patched_fetch(url: str, headers: dict, method: str = "GET", json_body=None):
            # Replace limit=500 with limit=3 to speed up CPU embedding test
            if "limit=500" in url:
                url = url.replace("limit=500", "limit=3")
                print(f"[Patched URL] Fetching with limit=3: {url}")
            return await original_fetch(url, headers, method, json_body)
            
        sync_engine.fetch_with_retry = patched_fetch
        
        # 1. Initialize system session
        print("1. Initializing System Session...")
        await sync_engine.init_system_session()
        
        # 2. Register webhook
        print("2. Registering Webhook on Mock HRM Server...")
        webhook_registered = await sync_engine.register_webhook_on_hrm()
        print(f"Webhook registered status: {webhook_registered}")
        
        # 3. Run full sync
        print("3. Running Full Sync (Small Mode)...")
        synced_count = await sync_engine.run_full_sync()
        print(f"Sync complete. Total records synced: {synced_count}")
        
        # Let's print out what tables and records exist now!
        from app.database import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            r = await conn.execute(text("SELECT count(*) FROM data_document_embeddings_store;"))
            row_count = r.scalar()
            print(f"Total rows in data_document_embeddings_store after sync: {row_count}")
            
            # Print sync history status
            r_history = await conn.execute(text("SELECT status, records_synced, started_at, completed_at FROM sync_history ORDER BY started_at DESC LIMIT 1;"))
            last_run = r_history.fetchone()
            if last_run:
                print(f"Last sync run status in database: {last_run[0]}, synced count: {last_run[1]}, time: {last_run[3]}")

    except Exception as e:
        print(f"Error occurred during sync run: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_run_small())
