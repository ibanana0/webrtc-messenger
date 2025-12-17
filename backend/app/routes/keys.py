from flask import Blueprint, jsonify, request
from app.utils.jwt_utils import token_required
from ..models.user import User
from .. import db
import logging

logger = logging.getLogger(__name__)

keys_bp = Blueprint('keys', __name__, url_prefix='/api/keys')


@keys_bp.route('/user/<username>', methods=['GET'])
@token_required
def get_user_public_key(username: str):
    try:
        user = User.query.filter_by(username=username.lower()).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.public_key:
            return jsonify({
                'error': 'User has not set up E2E encryption',
                'code': 'NO_PUBLIC_KEY'
            }), 404
            
        return jsonify({
            'username': user.username,
            'public_key': user.public_key
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching public key for {username}: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    
@keys_bp.route('/me', methods=['PUT'])
@token_required
def update_my_public_key():
    try:
        current_user_id = request.user_id  # Set by token_required decorator
        data = request.get_json()
        
        public_key = data.get('public_key')
        
        if not public_key:
            return jsonify({'error': 'public_key is required'}), 400
            
        # Validasi format public key (basic check)
        if not _is_valid_public_key_format(public_key):
            return jsonify({'error': 'Invalid public key format'}), 400
            
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if this is first time or update
        is_first_setup = user.public_key is None
        
        user.public_key = public_key
        db.session.commit()
        
        logger.info(f"Public key {'set' if is_first_setup else 'updated'} for user {user.username}")
        
        return jsonify({
            'message': f"Public key {'set' if is_first_setup else 'updated'} successfully",
            'is_first_setup': is_first_setup
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating public key: {e}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@keys_bp.route('/users', methods=['POST'])
@token_required
def get_multiple_public_keys():
    try:
        data = request.get_json()
        usernames = data.get('usernames', [])
        
        if not usernames or not isinstance(usernames, list):
            return jsonify({'error': 'usernames must be a non-empty array'}), 400
            
        # Limit untuk mencegah abuse
        if len(usernames) > 50:
            return jsonify({'error': 'Maximum 50 usernames per request'}), 400
            
        users = User.query.filter(
            User.username.in_([u.lower() for u in usernames])
        ).all()
        
        keys = {}
        for username in usernames:
            user = next((u for u in users if u.username == username.lower()), None)
            keys[username.lower()] = user.public_key if user else None
            
        return jsonify({'keys': keys}), 200
        
    except Exception as e:
        logger.error(f"Error fetching multiple public keys: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def _is_valid_public_key_format(public_key: str) -> bool:
    if not public_key:
        return False
        
    public_key = public_key.strip()
    
    return (
        public_key.startswith('-----BEGIN PUBLIC KEY-----') and
        public_key.endswith('-----END PUBLIC KEY-----')
    )