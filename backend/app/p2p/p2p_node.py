import trio
from libp2p import new_host, create_new_key_pair, TProtocol  # Lebih sederhana!
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
        self._running = False
        self._connected_peers = set()
    
    async def start(self):
        try:
            # membuat key pair yang unik untuk setiap node, digunakan untuk enkripsi
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
                
                # dijalankan terus
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
            self._connected_peers.add(peer_info.peer_id.pretty())
            
            logger.info(f"Connected to peer: {peer_info.peer_id.pretty()}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to connect to peer: {e}")
            return False
   
    async def send_message(self, peer_id: str, message: dict) -> bool:
        try:
            # Cari peer info dari connected peers
            from libp2p.peer.id import ID
            target_peer_id = ID.from_base58(peer_id)
            
            stream = await self.host.new_stream(target_peer_id, [CHAT_PROTOCOL_ID])
            data = json.dumps(message).encode('utf-8')
            
            await stream.write(data)
            await stream.close()
            
            logger.info(f'Sent message to {peer_id}: {message}')
            return True
        
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False
    
    async def broadcast_message(self, message: dict):
        for peer_id in self._connected_peers:
            await self.send_message(peer_id, message)
    
    def get_peer_id(self) -> str:
        if self.host:
            return self.host.get_id().pretty()
        return ""
    
    def get_addresses(self) -> list:
        if self.host:
            return [str(addr) for addr in self.host.get_addrs()]
        return []
    
    def get_full_addresses(self) -> list:
        if self.host:
            peer_id = self.get_peer_id()
            return [f"{addr}/p2p/{peer_id}" for addr in self.host.get_addrs()]
        return []
    
    def set_message_callback(self, callback: Callable):
        self.on_message_callback = callback
    
    async def stop(self):
        self._running = False
        logger.info("Node stopped")