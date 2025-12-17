from flask import request
from flask_socketio import emit, join_room, leave_room
from app import socketio
from app.p2p.p2p_manager import p2p_manager

connected_user = {}

@socketio.on('connect')
def handle_connect():
    print(f'Client Connected: {request.sid}')
    
    # Kirim status P2P ke client baru
    node_info = p2p_manager.get_node_info()
    emit('p2p_status', {
        'is_running': p2p_manager.node is not None,
        'node_info': node_info
    })

@socketio.on('disconnect')
def handle_disconnect():
    user = connected_user.pop(request.sid, None)
    if user:
        emit('user_left', {'username': user['username']}, broadcast=True)
    print(f'Client Disconnected: {request.sid}')
    online_users = [u['username'] for u in connected_user.values()]
    emit('online_users', {'users': online_users}, broadcast=True)
    print(f'Client Disconnected: {request.sid}')

@socketio.on('join')
def handle_join(data):
    username = data.get('username')
    if username:
        connected_user[request.sid] = {'username': username}
        join_room('main')
        emit('user_joined', {'username' : username}, room='main')
        
        online_users = [u['username'] for u in connected_user.values()]
        emit('online_users', {'users': online_users}, room='main')
        
        # Kirim info P2P ke user yang baru join (node lebih mungkin ready)
        node_info = p2p_manager.get_node_info()
        peer_count = 0
        known_peers = []
        if p2p_manager.gossip_handler:
            known_peers = list(p2p_manager.gossip_handler.get_known_peers().values())
            peer_count = len(known_peers)
        
        emit('p2p_info', {
            'node_info': node_info,
            'peer_count': peer_count,
            'known_peers': known_peers
        })

@socketio.on('leave')
def handle_leave(data):
    username = data.get('username')
    if username:
        leave_room('main')
        connected_user.pop(request.sid, None)
        emit('user_left', {'username': username}, room='main')

@socketio.on('send_message')
def handle_message(data):
    username = data.get('username')
    message = data.get('message')
    timestamp = data.get('timestamp')
    encrypted = data.get('encrypted', False)
    
    if username and message:
        emit('receive_message', {
            'username': username,
            'message': message,
            'timestamp': timestamp,
            'encrypted': encrypted
        }, room='main')
    
    p2p_manager.send_message(
            sender=username,
            content=message,
            timestamp=timestamp
        )

@socketio.on('connect_peer')
def handle_connect_peer(data):
    address = data.get('address')
    if address:
        try:
            p2p_manager.connect_to_peer(address)
            emit('peer_connection_status', {
                'success': True,
                'address': address,
                'message': 'Connection initiated'
            })
        except Exception as e:
            emit('peer_connection_status', {
                'success': False,
                'address': address,
                'error': str(e)
            })

@socketio.on('get_p2p_info')
def handle_get_p2p_info():
    node_info = p2p_manager.get_node_info()
    peer_count = 0
    known_peers = []

    if p2p_manager.gossip_handler:
        known_peers = list(p2p_manager.gossip_handler.get_known_peers().values())
        peer_count = len(known_peers)
    
    emit('p2p_info', {
        'node_info': node_info,
        'peer_count': peer_count,
        'known_peers': known_peers
    })

def on_peer_connected(peer_id: str):
    socketio.emit('peer_connected', {'peer_id': peer_id}, room='main')

def on_peer_disconnected(peer_id: str):
    socketio.emit('peer_disconnected', {'peer_id': peer_id}, room='main')