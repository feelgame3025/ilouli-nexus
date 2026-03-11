"""Application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "4010"))
DB_PATH = os.getenv("DB_PATH", "/home/feel3025/myproject/ilouli-nexus/.data/nexus.db")
JWT_SECRET = os.getenv("JWT_SECRET", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Service URLs (internal)
NEWS_API_URL = "http://localhost:4008"
COMMUNITY_API_URL = "http://localhost:4002"
STOCK_API_URL = "http://localhost:4003"

# CORS
ALLOWED_ORIGINS = [
    "https://nexus.ilouli.com",
    "https://ilouli.com",
    "http://localhost:3000",
]
