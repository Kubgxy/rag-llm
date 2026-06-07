# -*- coding: utf-8 -*-
import asyncio
import sys

# Windows terminal UTF-8 encoding support
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.append(r"c:\my-project\rag-llm\backend")

async def test_run():
    print("Starting sync engine test run...")
    try:
        from app.services.sync_engine import sync_engine
        
        # 1. Initialize system session
        print("1. Initializing System Session...")
        await sync_engine.init_system_session()
        
        # 2. Register webhook
        print("2. Registering Webhook on Mock HRM Server...")
        webhook_registered = await sync_engine.register_webhook_on_hrm()
        print(f"Webhook registered status: {webhook_registered}")
        
        # 3. Run full sync
        print("3. Running Full Sync...")
        synced_count = await sync_engine.run_full_sync()
        print(f"Sync complete. Total records synced: {synced_count}")
        
    except Exception as e:
        print(f"Error occurred during sync run: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_run())
