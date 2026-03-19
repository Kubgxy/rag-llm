# API Specifications

This document describes the exact JSON request/response contracts the frontend expects from the backend. The backend team should implement these endpoints to match.

**Base URL**: Configured via `VITE_API_BASE_URL` environment variable (default: `http://localhost:8000`)

---

## 1. Upload Document

Upload a PDF file for processing. The backend should extract text, generate a summary, and produce a knowledge graph (mindmap).

### Request

```
POST /upload
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `File` (binary) | ✅ | PDF file to process |

### Response — `200 OK`

```json
{
  "summary": "# Document Summary\n\nThis document covers...\n\n## Key Points\n- Point A\n- Point B\n- Point C",
  "nodes": [
    {
      "id": "node-0",
      "label": "Main Topic",
      "position": { "x": 250, "y": 0 },
      "type": "input"
    },
    {
      "id": "node-1",
      "label": "Sub-topic A",
      "position": { "x": 100, "y": 120 }
    },
    {
      "id": "node-2",
      "label": "Sub-topic B",
      "position": { "x": 400, "y": 120 }
    }
  ],
  "edges": [
    {
      "id": "edge-0",
      "source": "node-0",
      "target": "node-1",
      "animated": true
    },
    {
      "id": "edge-1",
      "source": "node-0",
      "target": "node-2",
      "animated": true
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `summary` | `string` | Markdown-formatted document summary |
| `nodes` | `Array<Node>` | Array of mindmap nodes |
| `nodes[].id` | `string` | Unique node identifier |
| `nodes[].label` | `string` | Display text for the node |
| `nodes[].position` | `{x: number, y: number}` | Coordinates for node placement |
| `nodes[].type` | `string` (optional) | ReactFlow node type (`'input'`, `'output'`, `'default'`) |
| `edges` | `Array<Edge>` | Array of connections between nodes |
| `edges[].id` | `string` | Unique edge identifier |
| `edges[].source` | `string` | Source node ID |
| `edges[].target` | `string` | Target node ID |
| `edges[].animated` | `boolean` (optional) | Whether the edge is animated (default `true`) |

### Error Response — `4xx / 5xx`

```json
{
  "detail": "Unsupported file type. Only PDF files are accepted."
}
```

---

## 2. Single Model Chat

Send a user question to a specific AI model for RAG-powered question answering.

### Request

```
POST /chat/single
Content-Type: application/json
```

```json
{
  "query": "What are the main findings of the document?",
  "model_name": "typhoon-2.5"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | ✅ | User's question |
| `model_name` | `string` | ✅ | Model identifier (see Available Models) |

### Response — `200 OK`

```json
{
  "answer": "Based on the document, the main findings are:\n\n1. **Finding A** — Description...\n2. **Finding B** — Description...\n\n> The document emphasizes...",
  "sources": [
    {
      "page": 3,
      "text": "Relevant excerpt from the document..."
    },
    {
      "page": 7,
      "text": "Another relevant excerpt..."
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `answer` | `string` | Markdown-formatted answer from the model |
| `sources` | `Array<Source>` (optional) | Retrieved document chunks used for the answer |
| `sources[].page` | `number` | Page number of the source |
| `sources[].text` | `string` | Text excerpt from the source |

---

## 3. Compare Models (Arena)

Send the same question to multiple models simultaneously for comparison.

### Request

```
POST /chat/compare
Content-Type: application/json
```

```json
{
  "query": "Explain the methodology described in the paper",
  "models": ["typhoon-2.5", "chinda"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | ✅ | User's question |
| `models` | `string[]` | ✅ | Array of exactly 2 model IDs to compare |

### Response — `200 OK`

```json
{
  "responses": [
    {
      "model": "typhoon-2.5",
      "answer": "The methodology involves...\n\n### Steps\n1. Data collection\n2. Analysis\n3. Synthesis"
    },
    {
      "model": "chinda",
      "answer": "According to the document, the methodology consists of...\n\n- **Phase 1**: Initial assessment\n- **Phase 2**: Deep analysis"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `responses` | `Array<ModelResponse>` | One response per requested model |
| `responses[].model` | `string` | Model identifier matching the request |
| `responses[].answer` | `string` | Markdown-formatted answer from this model |

---

## Available Model IDs

These are the models currently configured in the frontend. The backend should accept these identifiers:

| ID | Display Name |
|---|---|
| `typhoon-2.5` | Typhoon 2.5 |
| `chinda` | Chinda |
| `llama-3.1` | LLaMA 3.1 |
| `gemma-2` | Gemma 2 |

---

## Error Handling

All error responses should follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

The frontend will display the `detail` field in a toast notification. If `detail` is not present, it falls back to `message`, then to the HTTP error message.

| HTTP Status | Description |
|---|---|
| `400` | Bad request (invalid parameters) |
| `413` | File too large |
| `415` | Unsupported file type |
| `422` | Validation error |
| `500` | Internal server error |
| `503` | Model service unavailable |
