"""Application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "4010"))
DB_PATH = os.getenv("DB_PATH", "/home/feel3025/myproject/ilouli-nexus/.data/nexus.db")
JWT_SECRET = os.getenv("JWT_SECRET", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Service URLs (internal)
NEWS_API_URL = os.getenv("NEWS_API_URL", "http://localhost:4008")
COMMUNITY_API_URL = os.getenv("COMMUNITY_API_URL", "http://localhost:4002")
STOCK_API_URL = os.getenv("STOCK_API_URL", "http://localhost:4003")

# AI Model
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
AI_ENDPOINT = os.getenv("AI_ENDPOINT", "https://models.inference.ai.azure.com")

# CORS
ALLOWED_ORIGINS = [
    "https://nexus.ilouli.com",
    "https://ilouli.com",
    "http://localhost:3000",
]
