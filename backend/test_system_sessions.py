# -*- coding: utf-8 -*-
import asyncio
import sys
import uuid
from httpx import AsyncClient

# Windows terminal UTF-8 encoding support
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.append(r"c:\my-project\rag-llm\backend")

async def test_system_sessions():
    print("🧪 [Test] Starting integration tests for System Sessions...")
    
    from app.main import app
    from app.database import engine
    from sqlalchemy import text
    from httpx import ASGITransport

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register a test user
        username = f"testuser_{uuid.uuid4().hex[:6]}"
        email = f"{username}@example.com"
        password = "testpassword123"
        
        print(f"\n1. Registering test user: {username} ({email})...")
        reg_resp = await ac.post("/auth/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        print(f"Status Code: {reg_resp.status_code}")
        assert reg_resp.status_code == 200, reg_resp.text
        user_data = reg_resp.json()
        print(f"User ID: {user_data.get('id')}")

        # 2. Login
        print("\n2. Logging in test user...")
        login_resp = await ac.post("/auth/login", json={
            "username": username,
            "password": password
        })
        print(f"Status Code: {login_resp.status_code}")
        assert login_resp.status_code == 200, login_resp.text
        tokens = login_resp.json()
        access_token = tokens.get("access_token")
        headers = {"Authorization": f"Bearer {access_token}"}
        print("Login successful! Access token obtained.")

        # 3. List System Sessions
        print("\n3. Testing GET /system-sessions...")
        list_resp = await ac.get("/system-sessions", headers=headers)
        print(f"Status Code: {list_resp.status_code}")
        assert list_resp.status_code == 200, list_resp.text
        sessions_list = list_resp.json()
        print(f"Sessions count: {len(sessions_list)}")
        print(f"Active sessions: {[s.get('id') for s in sessions_list]}")
        assert len(sessions_list) > 0, "No active system sessions found"
        assert any(s.get("id") == "hrm" for s in sessions_list), "hrm session not found"

        # 4. Get HRM System Session
        print("\n4. Testing GET /system-sessions/hrm...")
        get_resp = await ac.get("/system-sessions/hrm", headers=headers)
        print(f"Status Code: {get_resp.status_code}")
        assert get_resp.status_code == 200, get_resp.text
        session_detail = get_resp.json()
        print(f"Session Name: {session_detail.get('name')}")
        print(f"Sync Status: {session_detail.get('sync_status')}")
        print(f"Last Synced: {session_detail.get('last_synced_at')}")

        # 5. Get Sync History
        print("\n5. Testing GET /system-sessions/hrm/history...")
        hist_resp = await ac.get("/system-sessions/hrm/history", headers=headers)
        print(f"Status Code: {hist_resp.status_code}")
        assert hist_resp.status_code == 200, hist_resp.text
        history_list = hist_resp.json()
        print(f"History entries: {len(history_list)}")
        if history_list:
            last_entry = history_list[0]
            print(f"Last sync type: {last_entry.get('sync_type')}")
            print(f"Last sync status: {last_entry.get('status')}")
            print(f"Last synced records: {last_entry.get('records_synced')}")

        # 6. Create ChatSession linked to 'hrm'
        print("\n6. Creating ChatSession linked to 'hrm'...")
        session_id_uuid = uuid.uuid4()
        chat_sess_resp = await ac.post("/sessions", headers=headers, json={
            "title": "Test Shared Session",
            "session_type": "system",
            "model_name": "typhoon-2.5",
            "system_session_id": "hrm"
        })
        print(f"Status Code: {chat_sess_resp.status_code}")
        assert chat_sess_resp.status_code == 200, chat_sess_resp.text
        chat_sess_data = chat_sess_resp.json()
        chat_session_id = chat_sess_data.get("id")
        print(f"Created ChatSession ID: {chat_session_id}")
        assert chat_sess_data.get("system_session_id") == "hrm", "system_session_id not linked"

        # 7. Query RAG inside System Session Chat
        print("\n7. Querying RAG Chat inside System Session...")
        query = "นโยบายการแต่งกายของบริษัทเป็นอย่างไร" # Dress code policy
        print(f"Question: {query}")
        
        chat_resp = await ac.post("/chat/single", headers=headers, json={
            "query": query,
            "model_name": "iapp/chinda-qwen3-4b", # Or typhoon
            "session_id": chat_session_id
        })
        print(f"Status Code: {chat_resp.status_code}")
        assert chat_resp.status_code == 200, chat_resp.text
        chat_result = chat_resp.json()
        print("\n--- AI Response ---")
        print(chat_result.get("answer"))
        print("\n--- Citations ---")
        for citation in chat_result.get("citations", []):
            print(f"- File: {citation.get('file_name')} | Page: {citation.get('page_label')}")
            print(f"  Snippet: {citation.get('text_snippet')[:120]}...")
            print(f"  Score: {citation.get('similarity_score')}")

        print("\n🎉 [Test] All system session tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_system_sessions())
