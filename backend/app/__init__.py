import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO

# import config file
from .config import configs

# initialize extension
db = SQLAlchemy()
socketio = SocketIO()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # inisialisasi app
    app = Flask(__name__)
    app.config.from_object(configs[config_name]) # melakukan konfigurasi pada app untuk mengambil nama dari dictionary configs pada file app/config.py
    
    # inisialisasi dengan extension
    db.init_app(app=app)
    CORS(app=app, origins=app.config['CORS_ORIGIN'], supports_credentials=True)
    socketio.init_app(app=app,cors_allowed_origins=app.config['CORS_ORIGIN'], async_mode='eventlet')
    
    # membuat database
    with app.app_context():
        db.create_all()
        
    return app