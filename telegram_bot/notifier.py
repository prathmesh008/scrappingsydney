from telegram import Update, Bot
from database_manager import db_manager
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def notify_users():
    """
    Simulates a background job that checks for new events matches.
    In a real system, this would run periodically or be triggered by the scraper.
    """
    if not TOKEN:
        print("⚠️ No TELEGRAM_BOT_TOKEN found. Skipping notification check.")
        return

    print("🔔 Starting Notification Service...")
    bot = Bot(token=TOKEN)
    
    # 1. Get all users
    users = db_manager.get_all_users()
    if not users:
        print("No users to notify.")
        return

    # 2. For each user, perform a search based on their preferences
    # limitation: This does a fresh search. Ideally, we only check *newly added* events.
    # For MVP, we just show top recommendations.
    
    for user in users:
        chat_id, preferences, location = user
        if not preferences:
            continue
            
        print(f"Checking matches for User {chat_id} (Prefs: {preferences})...")
        
        # Search vector DB
        results = db_manager.search_events(query=preferences, n_results=3)
        
        metadatas = results['metadatas'][0]
        distances = results['distances'][0]
        
        # If we find a good match (distance is low, meaning similarity is high)
        # Note: default chroma/sentence-transformers distance is often L2 or Cosine.
        # Lower is usually better for L2. For cosine sim, logic might differ.
        # We'll just send the top result for now.
        
        if metadatas:
            top_event = metadatas[0]
            msg = (
                f"🌟 **Recommendation Match!**\n\n"
                f"Based on your interest in *'{preferences}'*, check this out:\n\n"
                f"📅 **{top_event['title']}**\n"
                f"📍 {top_event['venue']}\n"
                f"🔗 [View Event]({top_event['url']})"
            )
            
            try:
                await bot.send_message(chat_id=chat_id, text=msg, parse_mode='Markdown')
                print(f"   -> Sent alert to {chat_id}")
            except Exception as e:
                print(f"   -> Failed to send to {chat_id}: {e}")

if __name__ == "__main__":
    asyncio.run(notify_users())
