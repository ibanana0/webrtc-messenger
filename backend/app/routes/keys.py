from flask import Blueprint, jsonify, request
from app.utils.jwt_utils import token_required
from ..models.user import User
from .. import db
import logging
import base64

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
        current_user_id = request.user_id
        data = request.get_json()
        
        public_key = data.get('public_key')
        
        if not public_key:
            return jsonify({'error': 'public_key is required'}), 400
            
        if not _is_valid_x25519_public_key(public_key):
            return jsonify({'error': 'Invalid X25519 public key format'}), 400
            
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        is_first_setup = user.public_key is None
        
        user.public_key = public_key
        db.session.commit()
        
        logger.info(f"X25519 public key {'set' if is_first_setup else 'updated'} for user {user.username}")
        
        try:
            from app.p2p.p2p_manager import p2p_manager
            p2p_manager.broadcast_public_key(user.username, public_key)
            logger.info(f"🔑 Broadcasting X25519 public key for {user.username} to P2P network")
        except Exception as e:
            logger.warning(f"Failed to broadcast public key via P2P: {e}")
        
        return jsonify({
            'message': f"X25519 public key {'set' if is_first_setup else 'updated'} successfully",
            'is_first_setup': is_first_setup
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating public key: {e}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@keys_bp.route('/me/resync', methods=['POST'])
@token_required
def resync_my_public_key():
    """Re-broadcast public key to all P2P peers. Useful when P2P was connected after login."""
    try:
        current_user_id = request.user_id
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.public_key:
            return jsonify({'error': 'No public key to sync. Please setup E2E first.'}), 400
        
        from app.p2p.p2p_manager import p2p_manager
        p2p_manager.broadcast_public_key(user.username, user.public_key)
        
        logger.info(f"🔑 Manual resync triggered for {user.username}")
        
        return jsonify({
            'message': f"X25519 public key re-broadcasted for {user.username}",
            'username': user.username
        }), 200
        
    except Exception as e:
        logger.error(f"Error resyncing public key: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@keys_bp.route('/users', methods=['POST'])
@token_required
def get_multiple_public_keys():
    try:
        data = request.get_json()
        usernames = data.get('usernames', [])
        
        if not usernames or not isinstance(usernames, list):
            return jsonify({'error': 'usernames must be a non-empty array'}), 400
            
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

def _is_valid_x25519_public_key(public_key: str) -> bool:
    """
    Validasi X25519 public key dalam format base64.
    X25519 public key adalah 32 bytes, yang menghasilkan 44 karakter base64.
    """
    if not public_key:
        return False
        
    public_key = public_key.strip()
    
    try:
        decoded = base64.b64decode(public_key)
        return len(decoded) == 32
    except Exception:
        return False