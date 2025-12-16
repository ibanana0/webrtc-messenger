import os
from dotenv import load_dotenv

load_dotenv()  

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/p2p_messenger')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')   # displit agar membuat List dari domain yang dapat mengakses API
    
    P2P_PORT = int(os.environ.get('P2P_PORT', 8000))
    P2P_BOOTSTRAP_PEERS = os.environ.get('P2P_BOOTSTRAP_PEERS', '').split(',')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

configs = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}