import os
from pydantic_settings import BaseSettings
from typing import List
from typing import Literal


class Settings(BaseSettings):
    # Application settings
    APP_NAME: str = "RAG LLM Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
 
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS settings
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # File upload settings
    UPLOAD_DIR: str = "uploaded_docs"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # PostgreSQL + pgvector
    DATABASE_URL: str = "postgresql+asyncpg://raguser:ragpass@127.0.0.1:5433/ragllm"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://raguser:ragpass@127.0.0.1:5433/ragllm"

    # Ollama settings
    OLLAMA_HOST: str = "http://localhost:11434"
    DEFAULT_LLM_MODEL: str = "iapp/chinda-qwen3-4b"
    ALTERNATIVE_LLM_MODEL: str = "scb10x/typhoon2.5-qwen3-4b"
    ACTION_LLM_MODEL: str = "qwen2.5-coder:7b"
    LLM_RUNTIME_DEVICE: Literal["cpu", "gpu"] = "gpu"


    OLLAMA_NUM_GPU: int = -1
    # LLM_NUM_CTX: int = 4096
    # CPU_LLM_NUM_CTX: int = 4096
    # CPU_LLM_NUM_PREDICT: int = 256
    LLM_NUM_CTX: int = 16384
    CPU_LLM_NUM_CTX: int = 8192
    CPU_LLM_NUM_PREDICT: int = 512
    LLM_REQUEST_TIMEOUT: float = 600.0
    

    # Embedding settings
    EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # Reranking settings
    FLASHRANK_MODEL: str = "ms-marco-MiniLM-L-12-v2"

    # OCR settings
    TESSERACT_LANG: str = "tha+eng"
    PDF_DPI: int = 300
    MIN_TEXT_LENGTH: int = 100  # ถ้าข้อความน้อยกว่านี้จะใช้ OCR

    # Query settings
    SIMILARITY_TOP_K: int = 6 #4
    CPU_SIMILARITY_TOP_K: int = 2

    # JWT Auth
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Conversation Memory
    CONVERSATION_MEMORY_LIMIT: int = 15
    CONVERSATION_MEMORY_MAX_TOKENS: int = 4096
    
    # Web search settings
    TAVILY_API_KEY: str = "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"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
