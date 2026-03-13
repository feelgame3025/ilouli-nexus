"""Prompt templates for AI node extraction."""

SYSTEM_PROMPT = """You are a knowledge graph extraction engine for a Korean news/information platform.
Your job is to extract key concepts from articles and identify relationships between them.

Output ONLY valid JSON. No explanations, no markdown outside JSON.

Node types:
- concept: General concepts, ideas, trends
- tech: Technologies, AI models, software, platforms
- project: Companies, organizations, products, services
- decision: Policies, regulations, government decisions, laws
- stock: Stock tickers, financial instruments, market events

Relation types:
- related: General relationship
- causes: A causes or leads to B
- part_of: A is part of B
- uses: A uses or depends on B
- competes_with: A competes with B
- impacts: A impacts or affects B"""

EXTRACT_NODES_PROMPT = """Analyze the following articles and extract ALL important knowledge graph nodes and edges.

For each article, extract:
1. Key concepts, technologies, companies, people, events, policies, trends as nodes
2. Relationships between extracted nodes as edges

Rules:
- Extract 5-15 nodes per article — be thorough, capture all significant entities
- IMPORTANT: Extract specific named entities (company names, people, products, stock tickers) not just abstract concepts
- Each node title should be concise (2-5 words, prefer Korean if the article is Korean)
- Content should be a 1-2 sentence summary of what this node represents in context
- Assign appropriate node_type and relevant tags (3-5 tags per node for better linking)
- Create edges between related nodes — connect across articles when relevant
- If nodes across different articles are clearly the same concept, use the EXACT same title
- For stock-related articles: extract company name, industry, related companies, market trends as separate nodes

Output format:
{{
  "nodes": [
    {{
      "title": "node title",
      "content": "1-2 sentence description",
      "node_type": "concept|tech|project|decision|stock",
      "tags": ["tag1", "tag2"]
    }}
  ],
  "edges": [
    {{
      "source_title": "source node title",
      "target_title": "target node title",
      "relation_type": "related|causes|part_of|uses|competes_with|impacts"
    }}
  ]
}}

Articles:
{articles_text}"""

EXTRACT_MANUAL_PROMPT = """Analyze the following text and extract key knowledge graph nodes and edges.

Extract the most important concepts, entities, and their relationships.

Rules:
- Extract 3-10 nodes (focus on the most important concepts)
- Each node title should be concise (2-5 words)
- Content should be a 1-2 sentence summary
- Assign appropriate node_type and relevant tags
- Create edges between related nodes

Output format:
{{
  "nodes": [
    {{
      "title": "node title",
      "content": "1-2 sentence description",
      "node_type": "concept|tech|project|decision|stock",
      "tags": ["tag1", "tag2"]
    }}
  ],
  "edges": [
    {{
      "source_title": "source node title",
      "target_title": "target node title",
      "relation_type": "related|causes|part_of|uses|competes_with|impacts"
    }}
  ]
}}

Text:
{text}"""


def build_article_extraction_messages(articles: list[dict]) -> list[dict]:
    """Build messages for article node extraction.

    Args:
        articles: List of dicts with title, content, url, category.

    Returns:
        List of message dicts for the AI API.
    """
    articles_text = ""
    for i, article in enumerate(articles, 1):
        title = article.get("title", "Untitled")
        content = article.get("content", "")
        category = article.get("category", "general")
        # Truncate long content to save tokens
        if len(content) > 1500:
            content = content[:1500] + "..."
        articles_text += f"\n--- Article {i} [{category}] ---\nTitle: {title}\n{content}\n"

    user_prompt = EXTRACT_NODES_PROMPT.format(articles_text=articles_text)

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def build_manual_extraction_messages(text: str) -> list[dict]:
    """Build messages for manual text node extraction.

    Args:
        text: Raw text to extract nodes from.

    Returns:
        List of message dicts for the AI API.
    """
    # Truncate very long text
    if len(text) > 5000:
        text = text[:5000] + "..."

    user_prompt = EXTRACT_MANUAL_PROMPT.format(text=text)

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
