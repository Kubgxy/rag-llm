import os
import pickle
import asyncio
from llama_index.core import Settings, StorageContext
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.postgres import PGVectorStore
from llama_index.retrievers.bm25 import BM25Retriever
from pythainlp.tokenize import word_tokenize
from app.config import settings


def thai_tokenizer(text: str):
    """Custom tokenizer สำหรับภาษาไทย เพื่อใช้ใน BM25"""
    return word_tokenize(text, engine="newmm")


class VectorStoreManager:
    """Service สำหรับจัดการ pgvector Vector Store ผ่าน LlamaIndex"""

    def __init__(self):
        self.embedding_model = None

        # In-memory store for BM25 Retrievers
        self.bm25_retrievers = {}
        self.bm25_nodes = {}
        # Path for persisting BM25 retrievers
        self.bm25_persist_dir = os.path.join("data", "bm25")
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

    def _get_vector_store(self, table_name: str = "document_embeddings_store") -> PGVectorStore:
        """สร้าง PGVectorStore instance"""
        return PGVectorStore.from_params(
            database=settings.DATABASE_URL_SYNC.split("/")[-1],
            host=settings.DATABASE_URL_SYNC.split("@")[1].split(":")[0],
            port=settings.DATABASE_URL_SYNC.split(":")[-1].split("/")[0],
            user=settings.DATABASE_URL_SYNC.split("://")[1].split(":")[0],
            password=settings.DATABASE_URL_SYNC.split(":")[2].split("@")[0],
            table_name=table_name,
            embed_dim=1024,  # bge-m3 = 1024 dimensions
        )

    def get_session_storage(self, session_id: str, for_sync: bool = False) -> StorageContext:
        """
        สร้าง Storage Context สำหรับ session นั้นๆ ผ่าน pgvector

        Args:
            session_id: Session ID ที่ต้องการสร้าง collection
            for_sync: True = สำหรับ sync operations (document indexing), False = สำหรับ async (queries)

        Returns:
            StorageContext ที่พร้อมใช้งาน
        """
        # ใช้ table name เดียวแชร์กัน โดยแยกข้อมูลด้วย metadata.session_id
        table_name = "document_embeddings_store"
        print(f"📦 [VectorStore] สร้าง storage สำหรับ session: {session_id}")
        print(f"   Table name: {table_name}")

        vector_store = self._get_vector_store(table_name=table_name)

        print(f"✅ [VectorStore] สร้าง pgvector store เรียบร้อย")
        return StorageContext.from_defaults(vector_store=vector_store)

    def save_bm25_retriever(self, session_id: str, retriever: BM25Retriever):
        """บันทึก BM25 Retriever สำหรับ session นั้น"""
        self.bm25_retrievers[session_id] = retriever
        persist_path = os.path.join(self.bm25_persist_dir, f"bm25_{session_id}.pkl")
        try:
            if hasattr(retriever, 'persist'):
                retriever.persist(persist_path)
            else:
                with open(persist_path, 'wb') as f:
                    pickle.dump(retriever, f)
            print(f"💾 [BM25] บันทึก BM25 index ล่าสุดของ session {session_id} เรียบร้อย")
        except Exception as e:
            print(f"⚠️ [BM25] ไม่สามารถบันทึกเป็นไฟล์ได้ แต่เก็บไว้ใน RAM สำเร็จ: {e}")

    def _save_bm25_nodes(self, session_id: str, nodes):
        persist_path = os.path.join(self.bm25_persist_dir, f"bm25_nodes_{session_id}.pkl")
        with open(persist_path, "wb") as f:
            pickle.dump(nodes, f)

    def _load_bm25_nodes(self, session_id: str):
        if session_id in self.bm25_nodes:
            return self.bm25_nodes[session_id]

        persist_path = os.path.join(self.bm25_persist_dir, f"bm25_nodes_{session_id}.pkl")
        if not os.path.exists(persist_path):
            return []

        try:
            with open(persist_path, "rb") as f:
                nodes = pickle.load(f)
            self.bm25_nodes[session_id] = nodes
            return nodes
        except Exception as e:
            print(f"⚠️ [BM25] โหลด bm25 nodes ไม่สำเร็จ: {e}")
            return []

    def extend_bm25_nodes(self, session_id: str, new_nodes):
        """
        รวม nodes เดิม + ใหม่ แล้วสร้าง BM25 retriever ใหม่
        เพื่อให้ค้นได้ทั้งไฟล์ PDF และข้อมูลเว็บที่ import เพิ่มเข้ามา
        """
        if not new_nodes:
            return

        old_nodes = self._load_bm25_nodes(session_id)
        merged_nodes = [*old_nodes, *new_nodes]
        self.bm25_nodes[session_id] = merged_nodes
        self._save_bm25_nodes(session_id, merged_nodes)

        bm25_retriever = BM25Retriever.from_defaults(
            nodes=merged_nodes,
            similarity_top_k=2,
            tokenizer=thai_tokenizer,
        )
        self.save_bm25_retriever(session_id, bm25_retriever)

    def _rebuild_bm25_from_db(self, session_id: str):
        """ดึงข้อมูล chunks จาก pgvector ใน DB แล้วสร้าง BM25 index ใหม่"""
        from sqlalchemy import create_engine, text
        from llama_index.core.schema import TextNode
        from llama_index.retrievers.bm25 import BM25Retriever

        table_name = "data_document_embeddings_store"
        print(f"🔄 [BM25 Rebuild] กำลังดึงข้อมูลของ session {session_id} จากตาราง {table_name} เพื่อสร้าง BM25...")

        try:
            # ใช้ sync connection URL
            engine = create_engine(settings.DATABASE_URL_SYNC)
            with engine.connect() as conn:
                # ตรวจสอบความถูกต้องของตารางก่อนรัน query ป้องกัน table not found error
                table_check = conn.execute(text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :table_name)"
                ), {"table_name": table_name}).scalar()

                if not table_check:
                    print(f"⚠️ [BM25 Rebuild] ไม่พบตาราง {table_name} ในฐานข้อมูล")
                    return None

                # ดึงเฉพาะคอลัมน์ที่จำเป็นสำหรับสร้าง nodes และกรองข้อมูลตาม session_id ใน metadata_
                result = conn.execute(
                    text(f"SELECT text, node_id, metadata_ FROM {table_name} WHERE metadata_->>'session_id' = :session_id"),
                    {"session_id": str(session_id)}
                )
                rows = result.fetchall()

            if not rows:
                print(f"⚠️ [BM25 Rebuild] ตาราง {table_name} ไม่มีข้อมูล")
                return None

            print(f"📦 [BM25 Rebuild] ดึงข้อมูลได้ {len(rows)} Chunks. กำลังสร้าง Nodes...")
            nodes = []
            for row in rows:
                text_content = row[0]
                node_id = row[1]
                metadata = row[2] or {}

                node = TextNode(
                    text=text_content,
                    id_=node_id,
                    metadata=metadata
                )
                nodes.append(node)

            # สร้าง BM25 Retriever และเซฟไฟล์ไว้
            bm25_retriever = BM25Retriever.from_defaults(
                nodes=nodes,
                similarity_top_k=2,
                tokenizer=thai_tokenizer,
            )

            # บันทึกลง cache และ persist ลงดิสก์
            self.bm25_nodes[session_id] = nodes
            self._save_bm25_nodes(session_id, nodes)
            self.save_bm25_retriever(session_id, bm25_retriever)

            print(f"✅ [BM25 Rebuild] สร้างและบันทึก BM25 สำหรับ session {session_id} สำเร็จ!")
            return bm25_retriever

        except Exception as e:
            print(f"⚠️ [BM25 Rebuild] เกิดข้อผิดพลาดในการ Rebuild: {e}")
            return None

    def get_bm25_retriever(self, session_id: str):
        """ดึง BM25 Retriever สำหรับ session"""
        if session_id in self.bm25_retrievers:
            return self.bm25_retrievers[session_id]
            
        # Try loading from disk
        persist_path = os.path.join(self.bm25_persist_dir, f"bm25_{session_id}.pkl")
        if os.path.exists(persist_path):
            try:
                if os.path.isdir(persist_path):
                    from llama_index.retrievers.bm25 import BM25Retriever
                    retriever = BM25Retriever.from_persist_dir(persist_path)
                else:
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
                
        # หากไม่พบไฟล์หรือโหลดไม่สำเร็จ ให้พยายาม rebuild จาก database
        rebuilt_retriever = self._rebuild_bm25_from_db(session_id)
        if rebuilt_retriever:
            return rebuilt_retriever
            
        return None

    def delete_session_embeddings(self, session_id: str):
        """ลบข้อมูล embeddings ทั้งหมดของ session นั้นๆ ออกจากตารางหลักและลบไฟล์ BM25"""
        from sqlalchemy import create_engine, text
        table_name = "data_document_embeddings_store"
        print(f"🗑️ [VectorStore] กำลังลบ embeddings ของ session: {session_id} จากตาราง {table_name}")
        try:
            engine = create_engine(settings.DATABASE_URL_SYNC)
            with engine.connect() as conn:
                with conn.begin():
                    # ลบข้อมูลที่ metadata_->>'session_id' ตรงกับ session_id
                    result = conn.execute(
                        text(f"DELETE FROM {table_name} WHERE metadata_->>'session_id' = :session_id"),
                        {"session_id": str(session_id)}
                    )
                    print(f"🗑️ [VectorStore] ลบสำเร็จ! จำนวนแถวที่ลบ: {result.rowcount}")
                    
            # ลบ BM25 files และ memory cache
            if session_id in self.bm25_retrievers:
                del self.bm25_retrievers[session_id]
            if session_id in self.bm25_nodes:
                del self.bm25_nodes[session_id]
                
            persist_path = os.path.join(self.bm25_persist_dir, f"bm25_{session_id}.pkl")
            if os.path.exists(persist_path):
                os.remove(persist_path)
            nodes_persist_path = os.path.join(self.bm25_persist_dir, f"bm25_nodes_{session_id}.pkl")
            if os.path.exists(nodes_persist_path):
                os.remove(nodes_persist_path)
        except Exception as e:
            print(f"⚠️ [VectorStore] ล้มเหลวในการลบ embeddings ของ session {session_id}: {e}")

    def close(self):
        """ปิดการเชื่อมต่อหรือเคลียร์ทรัพยากร"""
        print("🔌 [VectorStore] ปิดการเชื่อมต่อเรียบร้อย")
        self.bm25_retrievers.clear()
        self.bm25_nodes.clear()


# Singleton instance
vector_store_manager = VectorStoreManager()
# Alias for backwards compatibility
vector_store_service = vector_store_manager
