"""Initialize MongoDB Database"""
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

def init_database():
    client = MongoClient(os.getenv('MONGODB_URI'))
    db = client[os.getenv('MONGODB_DATABASE', 'mulberry_api')]
    
    print("🌾 Initializing Mulberry Open API Database...")
    
    collections = ['agents', 'api_keys', 'audit_logs']
    for collection in collections:
        if collection not in db.list_collection_names():
            db.create_collection(collection)
            print(f"✅ Created collection: {collection}")
    
    db.agents.create_index('agent_id', unique=True)
    db.api_keys.create_index('key_hash', unique=True)
    
    print("🎉 Database initialization complete!")
    client.close()

if __name__ == '__main__':
    init_database()
