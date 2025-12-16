from flask import Blueprint, jsonify, request
from app.p2p.p2p_manager import p2p_manager
from app.utils.jwt_utils import token_required

p2p_bp = Blueprint('p2p', __name__)

@p2p_bp.route('/info', methods=['GET'])
def get_node_info():
    info = p2p_manager.get_node_info()
    return jsonify({
        'success': True,
        'data': info
    })

@p2p_bp.route('/connect', methods=['POST'])
def connect_to_peer():
    data = request.get_json()
    address = data.get('address')
    
    if not address:
        return jsonify({
            'success': False,
            'error': 'Address is required'
        }), 400
    
    try:
        p2p_manager.connect_to_peer(address)
        return jsonify({
            'success': True,
            'message': f'Connection initiated to {address}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@p2p_bp.route('/peers', methods=['GET'])
def get_known_peers():
    if p2p_manager.gossip_handler:
        peers = p2p_manager.gossip_handler.get_known_peers()
        return jsonify({
            'success': True,
            'data': list(peers.values())
        })
    return jsonify({
        'success': True,
        'data': []
    })
    
@p2p_bp.route('/status', methods=['GET'])
def get_connection_status():
    node_info = p2p_manager.get_node_info()
    peer_count = 0
    
    if p2p_manager.gossip_handler:
        peer_count = len(p2p_manager.gossip_handler.get_known_peers())
        
    return jsonify({
        'success': True,
        'data': {
            'is_running': p2p_manager.node is not None and p2p_manager.node._running,
            'peer_count': peer_count,
            'node_info': node_info
        }
    })

@p2p_bp.route('/send', methods=['POST'])
@token_required
def send_p2p_message():
    data = request.get_json()
    message = data.get('message')
    
    if not message:
        return jsonify({
            'success': False,
            'error': 'Message is required'
        }), 400
    
    username = getattr(request, 'username', 'anonymous')
    
    p2p_manager.send_message(
        sender=username,
        content=message,
        timestamp=data.get('timestamp')
    )

    return jsonify({
        'success': True,
        'message': 'Message sent to P2P network'
    })