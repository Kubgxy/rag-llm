"""
FlashRank Reranker Integration
ใช้ FlashRank (Cross-Encoder) สำหรับ rerank ผลการค้นหาให้แม่นยำขึ้น
"""
from typing import List, Optional, Any

from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from pydantic import Field, ConfigDict
from app.config import settings

# Optional imports if you want explicit types, though flashrank is weakly typed at edges.
try:
    from flashrank import Ranker, RerankRequest
except ImportError:
    Ranker, RerankRequest = None, None


class FlashrankReranker(BaseNodePostprocessor):
    """Flashrank node postprocessor."""

    top_n: int = Field(default=2, description="Number of nodes to return after reranking")
    model_name: str = Field(default_factory=lambda: settings.FLASHRANK_MODEL, description="FlashRank model name")
    cache_dir: str = Field(default="/tmp", description="Directory to cache FlashRank models")

    ranker: Any = Field(default=None, exclude=True, description="FlashRank Ranker instance")

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        top_n: int = 2,
        model_name: str = "ms-marco-MiniLM-L-12-v2",
        cache_dir: str = "/tmp",
    ):
        super().__init__(top_n=top_n, model_name=model_name, cache_dir=cache_dir)
        import os
        from flashrank import Ranker

        os.makedirs(cache_dir, exist_ok=True)
        self.ranker = Ranker(model_name=model_name, cache_dir=cache_dir)
        self.top_n = top_n
        print(f"✅ FlashRank Reranker initialized: {model_name}")

    @classmethod
    def class_name(cls) -> str:
        return "FlashrankReranker"

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """Postprocess nodes using FlashRank reranking."""
        if query_bundle is None:
            raise ValueError("Query bundle must be provided.")

        from flashrank import RerankRequest

        if len(nodes) == 0:
            return []

        # Prepare passages for flashrank
        passages = []
        for i, node in enumerate(nodes):
            passages.append(
                {
                    "id": i,
                    "text": node.node.get_content(),
                    "meta": node.node.metadata,
                }
            )

        rerank_request = RerankRequest(
            query=query_bundle.query_str,
            passages=passages,
        )

        rerank_results = self.ranker.rerank(rerank_request)

        # Map back to NodeWithScore
        new_nodes = []
        for result in rerank_results[:self.top_n]:
            idx = result["id"]
            new_node = nodes[idx]
            # Replace score with reranker score
            new_node.score = result.get("score", 0.0)
            new_nodes.append(new_node)

        print(f"🎯 FlashRank Reranked: {len(nodes)} -> {len(new_nodes)} nodes")

        return new_nodes
