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

    # Chroma settings
    CHROMA_PATH: str = "./chroma_local_data"

    # Ollama settings
    OLLAMA_HOST: str = "http://localhost:11434"
    DEFAULT_LLM_MODEL: str = "iapp/chinda-qwen3-4b"
    ALTERNATIVE_LLM_MODEL: str = "scb10x/typhoon2.5-qwen3-4b"
    LLM_REQUEST_TIMEOUT: float = 600.0
    LLM_NUM_CTX: int = 4096
    CPU_LLM_NUM_CTX: int = 4096
    CPU_LLM_NUM_PREDICT: int = 256
    LLM_RUNTIME_DEVICE: Literal["cpu", "gpu"] = "cpu"
    OLLAMA_NUM_GPU: int = -1

    # Embedding settings
    EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # Reranking settings
    FLASHRANK_MODEL: str = "ms-marco-MiniLM-L-12-v2"

    # OCR settings
    TESSERACT_LANG: str = "tha+eng"
    PDF_DPI: int = 300
    MIN_TEXT_LENGTH: int = 100  # ถ้าข้อความน้อยกว่านี้จะใช้ OCR

    # Query settings
    SIMILARITY_TOP_K: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
