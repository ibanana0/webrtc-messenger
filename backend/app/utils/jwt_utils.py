import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app

def generate_token(user_id: int, username: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.now() + timedelta(days=7),
        'iat': datetime.now()
    }
    
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

def decode_token(token: str) -> dict:
    try: 
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(' ')[1]
            
        if not token:
            return jsonify({'error' : 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'error' : 'Token is invalid or expired'}), 401
        
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        return f(*args, **kwargs)
    return decorated