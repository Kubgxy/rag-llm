#!/usr/bin/env python3
"""
สคริปต์สำหรับรัน Backend Server
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║                   RAG LLM Backend Server                      ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Starting server...
📍 Host: {settings.HOST}:{settings.PORT}
🔧 Debug Mode: {settings.DEBUG}
📚 API Docs: http://{settings.HOST if settings.HOST != '0.0.0.0' else 'localhost'}:{settings.PORT}/docs

Press CTRL+C to stop the server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
