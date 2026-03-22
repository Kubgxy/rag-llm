import chromadb
from llama_index.core import Settings, StorageContext
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from app.config import settings


class VectorStoreManager:
    """Service สำหรับจัดการ Chroma Vector Store"""

    def __init__(self):
        self.client = None
        self.embedding_model = None
        self._initialize_embedding()

    def _initialize_embedding(self):
        """โหลด Embedding Model"""
        print(f"🧠 กำลังโหลด Embedding Model: {settings.EMBEDDING_MODEL}")
        self.embedding_model = HuggingFaceEmbedding(
            model_name=settings.EMBEDDING_MODEL
        )
        Settings.embed_model = self.embedding_model
        print("✅ Embedding Model พร้อมใช้งาน")

    def get_client(self) -> chromadb.ClientAPI:
        """สร้างหรือคืนค่า Chroma Client"""
        if self.client is None:
            print(f"🔗 กำลังเชื่อมต่อ ChromaDB ที่: {settings.CHROMA_PATH}")
            self.client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        return self.client

    def get_session_storage(self, session_id: str, for_sync: bool = False) -> StorageContext:
        """
        สร้าง Storage Context สำหรับ session นั้นๆ

        Args:
            session_id: Session ID ที่ต้องการสร้าง collection
            for_sync: True = สำหรับ sync operations (document indexing), False = สำหรับ async (queries)

        Returns:
            StorageContext ที่พร้อมใช้งาน
        """
        collection_name = f"chat_{session_id.lower().replace('-', '_')}"
        print(f"📦 [VectorStore] สร้าง storage สำหรับ session: {session_id}")
        print(f"   Collection name: {collection_name}")

        client = self.get_client()
        chroma_collection = client.get_or_create_collection(name=collection_name)
        
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

        print(f"✅ [VectorStore] สร้าง vector store เรียบร้อย")
        return StorageContext.from_defaults(vector_store=vector_store)

# Singleton instance
vector_store_manager = VectorStoreManager()
# Alias for backwards compatibility
vector_store_service = vector_store_manager

