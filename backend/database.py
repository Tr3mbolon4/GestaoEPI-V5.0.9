from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'cipolatti_db')

client = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await create_indexes()
    return db

async def close_db():
    global client
    if client:
        client.close()

async def get_db():
    global db
    if db is None:
        await connect_db()
    return db

async def create_indexes():
    global db
    
    # Users indexes
    await db.users.create_indexes([
        IndexModel([("username", ASCENDING)], unique=True),
        IndexModel([("email", ASCENDING)], unique=True)
    ])
    
    # Employees indexes
    await db.employees.create_indexes([
        IndexModel([("cpf", ASCENDING)], unique=True),
        IndexModel([("full_name", ASCENDING)])
    ])
    
    # Companies indexes
    await db.companies.create_indexes([
        IndexModel([("cnpj", ASCENDING)], unique=True)
    ])
    
    # EPIs indexes
    await db.epis.create_indexes([
        IndexModel([("ca_number", ASCENDING)]),
        IndexModel([("internal_code", ASCENDING)], unique=True, partialFilterExpression={"internal_code": {"$type": "string"}}),
        IndexModel([("qr_code", ASCENDING)], unique=True, partialFilterExpression={"qr_code": {"$type": "string"}})
    ])
    
    # Tools indexes
    await db.tools.create_indexes([
        IndexModel([("serial_number", ASCENDING)], unique=True, partialFilterExpression={"serial_number": {"$type": "string"}}),
        IndexModel([("internal_code", ASCENDING)], unique=True, partialFilterExpression={"internal_code": {"$type": "string"}}),
        IndexModel([("qr_code", ASCENDING)], unique=True, partialFilterExpression={"qr_code": {"$type": "string"}})
    ])
    
    # Suppliers indexes
    await db.suppliers.create_indexes([
        IndexModel([("cnpj", ASCENDING)], unique=True, partialFilterExpression={"cnpj": {"$type": "string"}})
    ])
