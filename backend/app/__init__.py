import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO

from .config import configs

db = SQLAlchemy()
socketio = SocketIO()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(configs[config_name])
    
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
    
    with app.app_context():
        db.create_all()
    
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        p2p_port = int(os.environ.get('P2P_PORT', 8000))
        from app.p2p.p2p_manager import p2p_manager
        p2p_manager.start(port=p2p_port, socketio=socketio)
    
    return app