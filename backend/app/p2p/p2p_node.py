import trio
from libp2p import new_host, create_new_key_pair, TProtocol
from libp2p.peer.peerinfo import info_from_p2p_addr
from libp2p.network.stream.net_stream import INetStream
from multiaddr import Multiaddr
import json
from typing import Callable, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CHAT_PROTOCOL_ID = TProtocol("/p2p-messenger/chat/1.0.0")

class P2PNode:
    def __init__(self, listen_port: int = 8000):
        self.listen_port = listen_port
        self.host = None
        self.on_message_callback: Optional[Callable] = None
        self.on_peer_connected_callback: Optional[Callable] = None
        self.on_peer_disconnected_callback: Optional[Callable] = None
        self._running = False
        self._connected_peers = set()
    
    async def start(self):
        try:
            key_pair = create_new_key_pair()
            listen_addr = Multiaddr(f'/ip4/0.0.0.0/tcp/{self.listen_port}')
            
            self.host = new_host(key_pair=key_pair)
            self.host.set_stream_handler(CHAT_PROTOCOL_ID, self._handle_stream)
            
            async with self.host.run(listen_addrs=[listen_addr]):
                self._running = True
                
                peer_id = self.host.get_id().pretty()
                addrs = self.host.get_addrs()
                logger.info(f'Node started with Peer ID: {peer_id}')
                logger.info(f'Listening on: {addrs}')

                for addr in addrs:
                    full_addr = f'{addr}/p2p/{peer_id}'
                    logger.info(f'Full address: {full_addr}')
                
                while self._running:
                    await trio.sleep(1)
        except Exception as e:
            logger.error(f"Failed to start node: {e}")
            raise
   
    async def _handle_stream(self, stream: INetStream):
        try:
            data = await stream.read()
            
            if data:
                message = json.loads(data.decode('utf-8'))
                peer_id = stream.muxed_conn.peer_id.pretty()
                logger.info(f'Received message from {peer_id}: {message}')

                if peer_id not in self._connected_peers:
                    self._connected_peers.add(peer_id)
                    logger.info(f'📡 Added inbound peer to connected peers: {peer_id}')
                    
                    if self.on_peer_connected_callback:
                        self.on_peer_connected_callback(peer_id)

                if self.on_message_callback:
                    self.on_message_callback(message, peer_id)
                    
        except Exception as e:
            logger.error(f'Error handling stream: {e}')
        finally:
            await stream.close()
   
    async def connect_to_peer(self, peer_multiaddr: str) -> bool:
        try:
            maddr = Multiaddr(peer_multiaddr)
            peer_info = info_from_p2p_addr(maddr)
            
            await self.host.connect(peer_info)
            peer_id_str = peer_info.peer_id.pretty()
            self._connected_peers.add(peer_id_str)
            
            logger.info(f"Connected to peer: {peer_id_str}")
            
            if self.on_peer_connected_callback:
                self.on_peer_connected_callback(peer_id_str)
            
            await self._send_handshake(peer_id_str)
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to connect to peer: {e}")
            return False
    
    async def _send_handshake(self, peer_id: str):
        """Send a handshake message after connecting to establish bidirectional awareness"""
        try:
            handshake = {
                'id': f'handshake_{self.get_peer_id()}_{peer_id}',
                'type': 'peer_announce',
                'addresses': self.get_full_addresses(),
                'from_peer_id': self.get_peer_id()
            }
            await self.send_message(peer_id, handshake)
            logger.info(f"🤝 Handshake sent to {peer_id}")
        except Exception as e:
            logger.error(f"Failed to send handshake: {e}")
   
    async def send_message(self, peer_id: str, message: dict) -> bool:
        try:
            from libp2p.peer.id import ID
            target_peer_id = ID.from_base58(peer_id)
            
            stream = await self.host.new_stream(target_peer_id, [CHAT_PROTOCOL_ID])
            data = json.dumps(message).encode('utf-8')
            
            await stream.write(data)
            await stream.close()
            
            logger.info(f'Sent message to {peer_id}: {message}')
            return True
        
        except Exception as e:
            logger.error(f"Failed to send message to {peer_id}: {e}")
            self.remove_peer(peer_id)
            return False
    
    async def broadcast_message(self, message: dict):
        peers_to_send = list(self._connected_peers.copy())
        failed_peers = []
        
        for peer_id in peers_to_send:
            success = await self.send_message(peer_id, message)
            if not success:
                failed_peers.append(peer_id)
        
        if failed_peers:
            logger.info(f"Failed to send to {len(failed_peers)} peers: {failed_peers}")
    
    def get_peer_id(self) -> str:
        if self.host:
            return self.host.get_id().pretty()
        return ""
    
    def get_addresses(self) -> list:
        if self.host:
            return [str(addr) for addr in self.host.get_addrs()]
        return []
    
    def get_full_addresses(self) -> list:
        """
        Get full multiaddr addresses that can be shared for peer connection.
        Filters out invalid addresses like 0.0.0.0 and prevents duplicate /p2p/.
        Also detects real container IP for Docker environments.
        """
        if not self.host:
            return []
        
        import socket
        
        peer_id = self.get_peer_id()
        full_addresses = []
        
        for addr in self.host.get_addrs():
            addr_str = str(addr)
            
            if '/ip4/0.0.0.0/' in addr_str:
                continue
            
            if '/ip4/127.0.0.1/' in addr_str:
                continue
            
            if '/p2p/' in addr_str:
                full_addresses.append(addr_str)
            else:
                full_addresses.append(f"{addr_str}/p2p/{peer_id}")
        
        if not full_addresses and peer_id:
            try:
                hostname = socket.gethostname()
                real_ip = socket.gethostbyname(hostname)
                
                if real_ip and real_ip != '127.0.0.1':
                    full_addresses.append(f"/ip4/{real_ip}/tcp/{self.listen_port}/p2p/{peer_id}")
                else:
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    try:
                        s.connect(('8.8.8.8', 80))
                        real_ip = s.getsockname()[0]
                        full_addresses.append(f"/ip4/{real_ip}/tcp/{self.listen_port}/p2p/{peer_id}")
                    except Exception:
                        full_addresses.append(f"/ip4/127.0.0.1/tcp/{self.listen_port}/p2p/{peer_id}")
                    finally:
                        s.close()
            except Exception as e:
                logger.warning(f"Could not detect real IP: {e}")
                full_addresses.append(f"/ip4/127.0.0.1/tcp/{self.listen_port}/p2p/{peer_id}")
        
        return full_addresses
    
    def set_message_callback(self, callback: Callable):
        self.on_message_callback = callback
    
    def set_peer_callbacks(self, on_connect: Callable = None, on_disconnect: Callable = None):
        """
        Set callbacks for peer connection events.
        
        Args:
            on_connect: Callback called when a peer connects (peer_id: str)
            on_disconnect: Callback called when a peer disconnects (peer_id: str)
        """
        if on_connect:
            self.on_peer_connected_callback = on_connect
        if on_disconnect:
            self.on_peer_disconnected_callback = on_disconnect
    
    def remove_peer(self, peer_id: str):
        """
        Remove a peer from connected peers set and trigger disconnect callback.
        
        Args:
            peer_id: The peer ID to remove
        """
        if peer_id in self._connected_peers:
            self._connected_peers.remove(peer_id)
            logger.info(f"Peer disconnected: {peer_id}")
            
            if self.on_peer_disconnected_callback:
                self.on_peer_disconnected_callback(peer_id)
    
    async def stop(self):
        self._running = False
        logger.info("Node stopped")