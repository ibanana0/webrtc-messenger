import threading
import trio
from typing import Optional
import logging
from .p2p_node import P2PNode
from .gossip_handler import GossipHandler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class P2PManager:
    _instance: Optional['P2PManager'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        self.node: Optional[P2PNode] = None
        self.gossip_handler: Optional[GossipHandler] = None
        self._thread: Optional[threading.Thread] = None
        self._trio_token = None
        self._send_channel = None
        self._receive_channel = None

    
    def start(self, port: int = 8000, socketio=None):
        if self._thread and self._thread.is_alive():
            logger.warning('P2P Node already running')
            return
        
        self.node = P2PNode(listen_port=port)
        self._socketio = socketio

        def run_trio():
            trio.run(self._run_node, socketio)
        
        self._thread = threading.Thread(target=run_trio, daemon=True)
        self._thread.start()
        
        logger.info(f"P2P Manager started on port {port}")
        
    async def _run_node(self, socketio):
        from app.routes.socket_events import on_peer_connected, on_peer_disconnected
        
        self.gossip_handler = GossipHandler(self.node, socketio)
        self._trio_token = trio.lowlevel.current_trio_token()
        self._send_channel, self._receive_channel = trio.open_memory_channel(100)
        
        self.node.set_peer_callbacks(
            on_connect=on_peer_connected,
            on_disconnect=on_peer_disconnected
        )
        
        async with trio.open_nursery() as nursery:
            nursery.start_soon(self.node.start)
            nursery.start_soon(self._process_commands)
    
    async def _process_commands(self):
        async for command in self._receive_channel:
            cmd_type = command.get('type')
            
            if cmd_type == 'connect':
                await self.node.connect_to_peer(command['address'])
            elif cmd_type == 'send':
                await self.gossip_handler.send_chat_message(
                    command['sender'],
                    command['content'],
                    command.get('timestamp'),
                    command.get('encrypted', False)
                )
            elif cmd_type == 'send_dm':
                await self.gossip_handler.send_direct_message(
                    command['sender'],
                    command['recipient'],
                    command['content'],
                    command.get('timestamp'),
                    command.get('encrypted', False)
                )
            elif cmd_type == 'broadcast_key':
                await self.gossip_handler.broadcast_key_announce(
                    command['username'],
                    command['public_key']
                )
    
    def connect_to_peer(self, peer_address: str):
        if self._trio_token and self._send_channel:
            trio.from_thread.run_sync(
                self._send_channel.send_nowait,
                {'type': 'connect', 'address': peer_address},
                trio_token=self._trio_token
            )
    
    def send_message(self, sender: str, content: str, timestamp: str = None, encrypted: bool = False):
        if self._trio_token and self._send_channel:
            trio.from_thread.run_sync(
                self._send_channel.send_nowait,
                {
                    'type': 'send',
                    'sender': sender,
                    'content': content,
                    'timestamp': timestamp,
                    'encrypted': encrypted
                },
                trio_token=self._trio_token
            )
    
    def send_direct_message(self, sender: str, recipient: str, content: str, timestamp: str = None, encrypted: bool = False):
        """Send a Direct Message via P2P to reach recipient on other nodes"""
        if self._trio_token and self._send_channel:
            trio.from_thread.run_sync(
                self._send_channel.send_nowait,
                {
                    'type': 'send_dm',
                    'sender': sender,
                    'recipient': recipient,
                    'content': content,
                    'timestamp': timestamp,
                    'encrypted': encrypted
                },
                trio_token=self._trio_token
            )
    
    def broadcast_public_key(self, username: str, public_key: str):
        """
        Broadcast a user's public key to all connected P2P peers.
        Called when a user uploads/updates their public key.
        """
        if self._trio_token and self._send_channel:
            try:
                trio.from_thread.run_sync(
                    self._send_channel.send_nowait,
                    {
                        'type': 'broadcast_key',
                        'username': username,
                        'public_key': public_key
                    },
                    trio_token=self._trio_token
                )
                logger.info(f"🔑 Queued key broadcast for: {username}")
            except Exception as e:
                logger.error(f"Failed to queue key broadcast: {e}")
        else:
            logger.warning("P2P not ready, cannot broadcast key")
    
    def get_node_info(self) -> dict:
        if self.node:
            return {
                'peer_id': self.node.get_peer_id(),
                'addresses': self.node.get_addresses(),
                'full_addresses': self.node.get_full_addresses()
            }
        return {}
    
    def stop(self):
        if self.node:
            self.node._running = False
        logger.info('P2P Manager stopped')

p2p_manager = P2PManager()