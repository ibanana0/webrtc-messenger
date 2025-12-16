from flask import Blueprint, jsonify, request
from app.p2p.p2p_manager import p2p_manager

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