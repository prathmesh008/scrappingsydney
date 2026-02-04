import sqlite3
import chromadb
from chromadb.utils import embedding_functions
import os
from typing import List, Dict, Optional

# Constants
DB_PATH = "sydney_events_bot.db"
CHROMA_PATH = "chroma_db"

class DatabaseManager:
    def __init__(self):
        # 1. Initialize SQLite (User Profiles)
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.create_tables()

        # 2. Initialize ChromaDB (Vector Store)
        self.chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        
        # Use a lightweight open-source embedding model
        # checks if user has set up a specific embedding function, else defaults
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="sydney_events",
            embedding_function=self.embedding_fn
        )

    def create_tables(self):
        """Create SQLite tables for user profiles."""
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                chat_id INTEGER PRIMARY KEY,
                username TEXT,
                preferences TEXT,  -- JSON string or free text
                location TEXT,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.conn.commit()

    # --- SQLITE OPERATIONS ---
    def update_user_preference(self, chat_id: int, username: str, preferences: str, location: str = "Sydney"):
        """Save or update user preferences."""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO users (chat_id, username, preferences, location)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(chat_id) DO UPDATE SET
                preferences=excluded.preferences,
                location=excluded.location,
                username=excluded.username,
                last_active=CURRENT_TIMESTAMP
        ''', (chat_id, username, preferences, location))
        self.conn.commit()
        print(f"✅ User {username} ({chat_id}) preferences updated.")

    def get_all_users(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT chat_id, preferences, location FROM users")
        return cursor.fetchall()

    def get_user(self, chat_id: int):
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM users WHERE chat_id = ?", (chat_id,))
        return cursor.fetchone()

    # --- VECTOR STORE OPERATIONS ---
    def add_events_to_vector_db(self, events: List[Dict]):
        """
        Ingest events into ChromaDB.
        events: List of dicts with keys ['id', 'text', 'metadata']
        """
        ids = [e['id'] for e in events]
        documents = [e['text'] for e in events]
        metadatas = [e['metadata'] for e in events]

        if not ids:
            return

        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        print(f"✅ Upserted {len(ids)} events into Vector DB.")

    def search_events(self, query: str, n_results: int = 5):
        """Semantic search for events."""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return results

# Singleton instance
db_manager = DatabaseManager()
