"""
    GossipHandler: Handler untuk message routing dan gossip protocol
    - Mengkoordinasikan antara Flask-SocketIO dan libp2p
    - Mengelola routing pesan antar node
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
    # Data class untuk menyimpan informasi pesan
    id: int
    sender: str
    content: str
    timestamp: str
    message_type: str = 'chat'
    
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
        
        # cek duplikasi
        if msg_id in self.seen_messages:
            logger.debug(f'Duplicate message ignored: {msg_id}')
        
        # tandai message sudah dilihat
        self.seen_messages.add(msg_id)
        
        if len(self.seen_messages) > 1000:
            self.seen_messages = set(list(self.seen_messages)[5000:])
        
        msg_type = message.get('type', 'chat')
        
        if msg_type == 'chat':
            self._handle_chat_message(message=message, peer_id=peer_id)
        elif msg_type == 'peer_discovery':
            self._handle_peer_discovery(message=message, peer_id=peer_id)
        elif msg_type == 'peer_announce':
            self._handle_peer_announce(message=message, peer_id=peer_id)
        else:
            logger.warning(f'Unknown message type: {msg_type}')
    
    def _handle_chat_message(self, message: dict, peer_id: str):
        logger.info(f"Chat from {peer_id}: {message.get('content')}")
        
        if self.socketio:
            self.socketio.emit('receive_message', {
                'username': message.get('sender'),
                'message': message.get('content'),
                'timestamp': message.get('timestamp'),
                'from_peer': True,
                'peer_id': peer_id
            }, room='main')
    
    def _handle_peer_discovery(self, message: dict, peer_id: str):
        peers_list = list(self.known_peers.values())
        logger.info(f"Peer discovery request from {peer_id}")
    
    def _handle_peer_announce(self, message: dict, peer_id: str):
        self.known_peers[peer_id] = {
            'peer_id': peer_id,
            'addresses': message.get('addresses', []),
            'last_seen': datetime.now().isoformat()
        }
        logger.info(f"New peer announced: {peer_id}")
    
    async def send_chat_message(self, sender: str, content: str, timestamp: str = None):
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        msg_id = self._generate_message_id(sender, content, timestamp)
        
        message = {
            'id': msg_id,
            'type': 'chat',
            'sender': sender,
            'content': content,
            'timestamp': timestamp
        }
        
        self.seen_messages.add(msg_id)
        
        await self.p2p_node.broadcast_message(message)
        
        logger.info(f"Broadcasted message: {msg_id}")
    
    def add_known_peer(self, peer_id: str, addresses: List[str]):
        self.known_peers[peer_id] = {
            'peer_id': peer_id,
            'addresses': addresses,
            'last_seen': datetime.now().isoformat()
        }
    
    def get_known_peers(self) -> Dict[str, dict]:
        return self.known_peers.copy() 