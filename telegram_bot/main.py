import logging
import os
import asyncio
from dotenv import load_dotenv

from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
    ConversationHandler
)

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

from database_manager import db_manager

# Load Env
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Setup Gemini
if GOOGLE_API_KEY:
    llm = ChatGoogleGenerativeAI(model="gemini-pro", google_api_key=GOOGLE_API_KEY)
else:
    llm = None
    print("⚠️ GOOGLE_API_KEY missing. AI features will be disabled.")

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# States for Conversation flow
GENRE, LOCATION, BUDGET, READY = range(4)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Entry point."""
    await update.message.reply_text(
        "👋 Hi! I'm your Sydney Event Assistant.\n\n"
        "I can help you find events based on your vibe. "
        "Let's set up your profile first.\n\n"
        "🎵 What kind of events do you like? (e.g., Jazz, Tech, Art, Parties)"
    )
    return GENRE

async def get_genre(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Capture genre/preference."""
    user_input = update.message.text
    context.user_data['preferences'] = user_input
    
    await update.message.reply_text(
        f"Got it! You like '{user_input}'.\n\n"
        "📍 Which area in Sydney do you prefer? (e.g., CBD, Newtown, Surry Hills, or 'Any')"
    )
    return LOCATION

async def get_location(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Capture location."""
    user_input = update.message.text
    context.user_data['location'] = user_input
    
    # Save to SQLite
    user = update.effective_user
    prefs = context.user_data.get('preferences', '')
    
    db_manager.update_user_preference(
        chat_id=user.id,
        username=user.username or user.first_name,
        preferences=prefs,
        location=user_input
    )
    
    await update.message.reply_text(
        "✅ Profile Saved!\n\n"
        "You can now ask me for recommendations like:\n"
        "- 'Find me something for this weekend'\n"
        "- 'Any good art exhibitions?'\n"
        "Or just type /recommend to use your saved preferences."
    )
    return ConversationHandler.END

async def recommend(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recommend based on saved preferences."""
    user = update.effective_user
    
    # Check if user exists in DB
    user_record = db_manager.get_user(user.id)
    query = ""
    
    if user_record and user_record[2]: # Index 2 is preferences
        query = user_record[2]
        await update.message.reply_text(f"🔎 Searching for events matching: *{query}*...", parse_mode='Markdown')
    else:
        await update.message.reply_text("🔎 Using general recommendation...")
        query = "Events in Sydney"

    # Search Vector DB
    results = db_manager.search_events(query, n_results=5)
    
    metadatas = results['metadatas'][0]
    
    if not metadatas:
        await update.message.reply_text("😔 No matching events found nearby.")
        return

    response = "🎉 *Here are my top picks:*\n\n"
    for i, event in enumerate(metadatas):
        title = event.get('title', 'Event')
        venue = event.get('venue', 'Unknown')
        date = event.get('date', 'TBA')
        url = event.get('url', '#')
        
        response += f"{i+1}. *{title}*\n📍 {venue} | 📅 {date[:10]}\n🔗 [More Info]({url})\n\n"

    await update.message.reply_text(response, parse_mode='Markdown', disable_web_page_preview=True)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle free-form chat with RAG (Gemini)."""
    text = update.message.text
    
    # Semantic Search to get context
    results = db_manager.search_events(text, n_results=5)
    metadatas = results['metadatas'][0]
    
    # If no LLM configured, just return list
    if not llm:
        if metadatas:
            await update.message.reply_text("Here's what I found (AI disabled):")
            for event in metadatas:
                await update.message.reply_text(f"🎈 {event.get('title')}\n📍 {event.get('venue')}\n🔗 {event.get('url')}")
        else:
            await update.message.reply_text("No events found.")
        return

    # Build Context String for RAG
    context_str = "\n".join([
        f"- {e.get('title')} at {e.get('venue')} on {e.get('date')} ({e.get('url')})"
        for e in metadatas
    ])

    if not context_str:
        await update.message.reply_text("I couldn't find any specific events matching that in my database, sorry!")
        return

    # Prompt Template
    template = """
    You are a helpful Sydney Event Assistant.
    Answer the user's question based ONLY on the following event context.

    Context:
    {context}

    User Question: {question}

    Format your answer as a friendly chat message suggesting the best options. Include the links.
    """
    
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm | StrOutputParser()

    # Generate Answer
    await update.message.reply_chat_action(action="typing")
    try:
        response = await chain.ainvoke({"context": context_str, "question": text})
        await update.message.reply_text(response, parse_mode='Markdown', disable_web_page_preview=True)
    except Exception as e:
        print(f"Gemini Error: {e}")
        await update.message.reply_text("I'm having trouble thinking right now. Try again later!")

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Registration cancelled.")
    return ConversationHandler.END

def main():
    if not TOKEN:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in .env")
        return

    application = ApplicationBuilder().token(TOKEN).build()

    # Conversation for Profile Setup
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start), CommandHandler('preferences', start)],
        states={
            GENRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_genre)],
            LOCATION: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_location)],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )

    application.add_handler(conv_handler)
    application.add_handler(CommandHandler('recommend', recommend))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("🤖 Bot is pooling...")
    application.run_polling()

if __name__ == '__main__':
    main()
