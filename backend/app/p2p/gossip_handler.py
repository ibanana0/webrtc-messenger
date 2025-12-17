"""
GossipHandler: Handler untuk message routing dan gossip protocol
"""

from typing import Callable, Dict, List, Set
import logging
from dataclasses import dataclass
from datetime import datetime
import hashlib
from .p2p_node import P2PNode
from flask_socketio import SocketIO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Message:
    id: int
    sender: str
    content: str
    timestamp: str
    message_type: str = 'chat'
    encrypted: bool = False
    
class GossipHandler:
    def __init__(self, p2p_node: P2PNode, socketio=None):
        """
        Args:
            p2p_node: Instance P2PNode
            socketio: Instance Flask-SocketIO
        """
        
        self.p2p_node = p2p_node
        self.socketio:SocketIO = socketio
        self.seen_messages: Set[str] = set()
        self.known_peers: Dict[str, dict] = {}
        
        self.p2p_node.set_message_callback(self.handle_incoming_message)
    
    def _generate_message_id(self, sender: str, content: str, timestamp: str) -> str:
        data = f"{sender}:{content}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def handle_incoming_message(self, message: dict, peer_id: str):
        msg_id = message.get('id')
        
        if msg_id in self.seen_messages:
            logger.debug(f'Duplicate message ignored: {msg_id}')
        
        self.seen_messages.add(msg_id)
        
        if len(self.seen_messages) > 1000:
            self.seen_messages = set(list(self.seen_messages)[5000:])
        
        msg_type = message.get('type', 'chat')
        
        if msg_type == 'chat':
            self._handle_chat_message(message=message, peer_id=peer_id)
        elif msg_type == 'direct_message':
            self._handle_direct_message(message=message, peer_id=peer_id)
        elif msg_type == 'peer_discovery':
            self._handle_peer_discovery(message=message, peer_id=peer_id)
        elif msg_type == 'peer_announce':
            self._handle_peer_announce(message=message, peer_id=peer_id)
        elif msg_type == 'key_announce':
            self._handle_key_announce(message=message, peer_id=peer_id)
        else:
            logger.warning(f'Unknown message type: {msg_type}')
    
    def _handle_chat_message(self, message: dict, peer_id: str):
        logger.info(f"Chat from {peer_id}: {message.get('content')}")
        
        if self.socketio:
            self.socketio.emit('receive_message', {
                'username': message.get('sender'),
                'message': message.get('content'),
                'timestamp': message.get('timestamp'),
                'encrypted': message.get('encrypted', False),
                'from_peer': True,
                'peer_id': peer_id
            }, room='main')
    
    def _handle_direct_message(self, message: dict, peer_id: str):
        """Handle incoming Direct Message from P2P network"""
        recipient = message.get('recipient')
        sender = message.get('sender')
        
        logger.info(f"DM from P2P: {sender} -> {recipient}")
        
        if self.socketio:
            from app.routes.socket_events import connected_user
            
            recipient_sid = None
            for sid, user_data in connected_user.items():
                if user_data.get('username') == recipient:
                    recipient_sid = sid
                    break
            
            if recipient_sid:
                self.socketio.emit('receive_direct_message', {
                    'username': sender,
                    'recipient': recipient,
                    'message': message.get('content'),
                    'timestamp': message.get('timestamp'),
                    'encrypted': message.get('encrypted', False),
                    'isDM': True,
                    'from_peer': True,
                    'peer_id': peer_id
                }, room=recipient_sid)
                logger.info(f"📩 DM delivered via P2P: {sender} -> {recipient}")
            else:
                logger.debug(f"Recipient {recipient} not on this node")
    
    def _handle_peer_discovery(self, message: dict, peer_id: str):
        peers_list = list(self.known_peers.values())
        logger.info(f"Peer discovery request from {peer_id}")
    
    def _handle_peer_announce(self, message: dict, peer_id: str):
        """Handle peer announcement - this establishes bidirectional peer tracking"""
        self.known_peers[peer_id] = {
            'peer_id': peer_id,
            'addresses': message.get('addresses', []),
            'last_seen': datetime.now().isoformat()
        }
        
        if peer_id not in self.p2p_node._connected_peers:
            self.p2p_node._connected_peers.add(peer_id)
            logger.info(f"🤝 Handshake received - added {peer_id} to connected peers")
            
            if self.p2p_node.on_peer_connected_callback:
                self.p2p_node.on_peer_connected_callback(peer_id)
        else:
            logger.info(f"Peer announce update from: {peer_id}")
    
    def _handle_key_announce(self, message: dict, peer_id: str):
        """
        Handle incoming key announcement from P2P network.
        This is called when another node broadcasts a user's public key.
        We store/update the public key in our local database.
        """
        username = message.get('username')
        public_key = message.get('public_key')
        
        if not username or not public_key:
            logger.warning(f"Invalid key_announce message from {peer_id}")
            return
        
        logger.info(f"🔑 Key announcement received: {username} from peer {peer_id}")
        
        try:
            from app.models.user import User
            from app import db, create_app
            
            app = create_app()
            with app.app_context():
                user = User.query.filter_by(username=username.lower()).first()
                
                if user:
                    if user.public_key != public_key:
                        user.public_key = public_key
                        db.session.commit()
                        logger.info(f"🔑 Updated public key for existing user: {username}")
                    else:
                        logger.debug(f"🔑 Public key unchanged for: {username}")
                else:
                    new_user = User(
                        username=username.lower(),
                        email=f"{username.lower()}@foreign.p2p",
                        public_key=public_key
                    )
                    new_user.password_hash = "FOREIGN_USER_NO_PASSWORD"
                    
                    db.session.add(new_user)
                    db.session.commit()
                    logger.info(f"🔑 Created foreign user entry for: {username}")
                
        except Exception as e:
            logger.error(f"Failed to save key announcement: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    async def broadcast_key_announce(self, username: str, public_key: str):
        """
        Broadcast a user's public key to all connected peers.
        Called when a user registers or updates their public key.
        """
        timestamp = datetime.now().isoformat()
        msg_id = self._generate_message_id(username, public_key[:50], timestamp)
        
        message = {
            'id': msg_id,
            'type': 'key_announce',
            'username': username,
            'public_key': public_key,
            'timestamp': timestamp
        }
        
        self.seen_messages.add(msg_id)
        
        await self.p2p_node.broadcast_message(message)
        
        logger.info(f"🔑 Broadcasted key announcement for: {username}")
    
    async def send_chat_message(self, sender: str, content: str, timestamp: str = None, encrypted: bool = False):
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        msg_id = self._generate_message_id(sender, content, timestamp)
        
        message = {
            'id': msg_id,
            'type': 'chat',
            'sender': sender,
            'content': content,
            'timestamp': timestamp,
            'encrypted': encrypted
        }
        
        self.seen_messages.add(msg_id)
        
        await self.p2p_node.broadcast_message(message)
        
        logger.info(f"Broadcasted message: {msg_id} (encrypted={encrypted})")
    
    async def send_direct_message(self, sender: str, recipient: str, content: str, timestamp: str = None, encrypted: bool = False):
        """Send Direct Message via P2P network to reach recipient on other nodes"""
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        msg_id = self._generate_message_id(sender, content, timestamp)
        
        message = {
            'id': msg_id,
            'type': 'direct_message',
            'sender': sender,
            'recipient': recipient,
            'content': content,
            'timestamp': timestamp,
            'encrypted': encrypted
        }
        
        self.seen_messages.add(msg_id)
        
        await self.p2p_node.broadcast_message(message)
        
        logger.info(f"📤 DM broadcasted via P2P: {sender} -> {recipient} (encrypted={encrypted})")
    
    def add_known_peer(self, peer_id: str, addresses: List[str]):
        self.known_peers[peer_id] = {
            'peer_id': peer_id,
            'addresses': addresses,
            'last_seen': datetime.now().isoformat()
        }
    
    def get_known_peers(self) -> Dict[str, dict]:
        return self.known_peers.copy() 