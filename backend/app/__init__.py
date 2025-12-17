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
    CORS(app=app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    socketio.init_app(app=app,cors_allowed_origins=app.config['CORS_ORIGINS'], async_mode='threading')
    
    from app.routes.auth import auth_bp
    from app.routes.p2p_routes import p2p_bp
    from app.routes.keys import keys_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(keys_bp)
    app.register_blueprint(p2p_bp, url_prefix='/api/p2p')
    from app.routes import socket_events
    
    # membuat database
    with app.app_context():
        db.create_all()
    
    # Start P2P manager only once (prevent double start during Flask reloader)
    # WERKZEUG_RUN_MAIN is set to 'true' only in the reloader child process
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        p2p_port = int(os.environ.get('P2P_PORT', 8000))
        from app.p2p.p2p_manager import p2p_manager
        p2p_manager.start(port=p2p_port, socketio=socketio)
    
    return app