import os
import pymongo
from database_manager import db_manager
from datetime import datetime

# Configuration
MONGO_URI = "mongodb://localhost:27017/sydney-events"

def ingest_data():
    print("🔌 Connecting to MongoDB...")
    client = pymongo.MongoClient(MONGO_URI)
    db = client["sydney-events"]
    collection = db["events"]

    # fetch only active events
    cutoff_date = datetime.now()
    cursor = collection.find({
        # "startDate": {"$gte": cutoff_date}, # Optional: only future events
        "status": {"$ne": "inactive"}
    })

    events_to_store = []

    print("📥 Fetching events...")
    count = 0
    for doc in cursor:
        # Create a rich text representation for semantic search
        # We combine Title, Description, Venue, and Tags
        
        title = doc.get("title", "Unknown Event")
        desc = doc.get("description", "")
        venue = doc.get("venue", "Sydney")
        date_str = doc.get("startDate", "")
        
        # Combine into a single text blob for the LLM/Embedding model
        text_content = f"Title: {title}. Venue: {venue}. Date: {date_str}. Description: {desc}"
        
        events_to_store.append({
            "id": str(doc["_id"]),
            "text": text_content,
            "metadata": {
                "title": title,
                "venue": venue,
                "date": str(date_str),
                "url": doc.get("sourceUrl", "")
            }
        })
        count += 1

    if events_to_store:
        print(f"🧬 Embedding and Indexing {len(events_to_store)} events into ChromaDB...")
        db_manager.add_events_to_vector_db(events_to_store)
        print("✅ Ingestion Complete.")
    else:
        print("⚠️ No events found to ingest.")

if __name__ == "__main__":
    ingest_data()
