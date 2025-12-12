from flask import request
from flask_socketio import emit, join_room, leave_room
from app import socketio

connected_user = {}

@socketio.on('connect')
def handle_connect():
    print(f'Client Connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    user = connected_user.pop(request.sid, None)
    if user:
        emit('user_left', {'username': user['username']}, broadcast=True)
    print(f'Client Disconnected: {request.sid}')

@socketio.on('join')
def handle_join(data):
    username = data.get('username')
    if username:
        connected_user[request.sid] = {'username', username}
        join_room('main')
        emit('user_joined', {'username' : username}, room='main')
        
        online_users = [u['username'] for u in connected_user.values()]
        emit('online_users', {'username': online_users}, room='main')

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
    
    if username and message:
        emit('receive_message', {
            'username': username,
            'message': message,
            'timestamp': data.get('timestamp')
        }, room='main')