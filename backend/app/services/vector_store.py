import chromadb
import os
import pickle
import asyncio
from llama_index.core import Settings, StorageContext
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.retrievers.bm25 import BM25Retriever
from pythainlp.tokenize import word_tokenize
from app.config import settings


def thai_tokenizer(text: str):
    """Custom tokenizer สำหรับภาษาไทย เพื่อใช้ใน BM25"""
    return word_tokenize(text, engine="newmm")


class VectorStoreManager:
    """Service สำหรับจัดการ Chroma Vector Store"""

    def __init__(self):
        self.client = None
        self.embedding_model = None
        
        # In-memory store for BM25 Retrievers
        self.bm25_retrievers = {}
        # Path for persisting BM25 retrievers
        self.bm25_persist_dir = os.path.join(os.path.dirname(settings.CHROMA_PATH), "bm25")
        os.makedirs(self.bm25_persist_dir, exist_ok=True)
        
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

    def save_bm25_retriever(self, session_id: str, retriever: BM25Retriever):
        """บันทึก BM25 Retriever สำหรับ session นั้น"""
        self.bm25_retrievers[session_id] = retriever
        # Save exact dict state instead of pickling the whole C-Object retriever
        persist_path = os.path.join(self.bm25_persist_dir, f"bm25_{session_id}.pkl")
        try:
            # Save the object using its built-in persist method if available, else pickle
            if hasattr(retriever, 'persist'):
                retriever.persist(persist_path)
            else:
                with open(persist_path, 'wb') as f:
                    pickle.dump(retriever, f)
            print(f"💾 [BM25] บันทึก BM25 index ล่าสุดของ session {session_id} เรียบร้อย")
        except Exception as e:
            print(f"⚠️ [BM25] ไม่สามารถบันทึกเป็นไฟล์ได้ แต่เก็บไว้ใน RAM สำเร็จ: {e}")

    def get_bm25_retriever(self, session_id: str):
        """ดึง BM25 Retriever สำหรับ session"""
        if session_id in self.bm25_retrievers:
            return self.bm25_retrievers[session_id]
            
        # Try loading from disk
        persist_path = os.path.join(self.bm25_persist_dir, f"bm25_{session_id}.pkl")
        if os.path.exists(persist_path):
            try:
                # First try to load as object via persist if supported, else pickle load
                # Actually, if we pickled the object directly, load it directly
                # Or LlamaIndex 0.10+ uses from_persist_dir 
                
                # We will just use pickle.load because we dumped the object
                with open(persist_path, 'rb') as f:
                    retriever = pickle.load(f)
                    
                # Re-attach custom tokenizer just in case
                if hasattr(retriever, 'tokenizer'):
                    retriever.tokenizer = thai_tokenizer
                
                self.bm25_retrievers[session_id] = retriever
                print(f"📂 [BM25] โหลด BM25 index ของ session {session_id} จากพาธสำเร็จ")
                return retriever
            except Exception as e:
                print(f"⚠️ [BM25] ไม่สามารถโหลด BM25 จากไฟล์ได้: {e}")
                
        return None

# Singleton instance
vector_store_manager = VectorStoreManager()
# Alias for backwards compatibility
vector_store_service = vector_store_manager

