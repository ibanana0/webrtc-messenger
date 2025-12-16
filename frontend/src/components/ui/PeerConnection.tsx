'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/glass/button'
import { Input } from '@/components/ui/glass/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass/card'
/**
 * Props untuk komponen PeerConnection.
 */
interface PeerConnectionProps {
    /** Info node P2P saat ini */
    nodeInfo: {
        peer_id: string
        addresses: string[]
        full_addresses: string[]
    } | null
    
    /** Daftar peer yang diketahui */
    knownPeers: Array<{
        peer_id: string
        addresses: string[]
        last_seen: string
    }>
    
    /** Jumlah peer yang terhubung */
    peerCount: number
    
    /** Callback untuk connect ke peer */
    onConnectPeer: (address: string) => void
    
    /** Callback untuk refresh info P2P */
    onRefresh: () => void
}
/**
 * Komponen untuk mengelola koneksi P2P.
 * 
 * Penjelasan:
 * - Menampilkan Peer ID dan alamat node saat ini
 * - Form untuk connect ke peer baru
 * - Daftar peer yang sudah terhubung
 * 
 * Cara Kerja:
 * 1. User melihat Peer ID mereka untuk dibagikan ke user lain
 * 2. User memasukkan address peer yang ingin dihubungi
 * 3. Klik Connect untuk initiate P2P connection
 * 4. Setelah connected, pesan akan di-share antar nodes
 */
export function PeerConnection({
    nodeInfo,
    knownPeers,
    peerCount,
    onConnectPeer,
    onRefresh
}: PeerConnectionProps) {
    const [peerAddress, setPeerAddress] = useState('')
    const [isConnecting, setIsConnecting] = useState(false)
    const [showFullAddress, setShowFullAddress] = useState(false)
    /**
     * Handler untuk connect ke peer.
     */
    const handleConnect = async () => {
        if (!peerAddress.trim()) return
        
        setIsConnecting(true)
        try {
            onConnectPeer(peerAddress)
            setPeerAddress('')
        } finally {
            // Set timeout untuk reset loading state
            setTimeout(() => setIsConnecting(false), 2000)
        }
    }
    /**
     * Copy alamat ke clipboard.
     */
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        // Opsional: Tambahkan toast notification
    }
    return (
        <Card className="backdrop-blur-xl border-white/10">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">P2P Network</CardTitle>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={onRefresh}
                        className="text-xs"
                    >
                        🔄 Refresh
                    </Button>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Node Info Section */}
                {nodeInfo ? (
                    <div className="space-y-2">
                        <div className="text-xs text-gray-400">Your Peer ID:</div>
                        <div 
                            className="bg-black/20 p-2 rounded text-xs font-mono break-all cursor-pointer hover:bg-black/30 transition-colors"
                            onClick={() => copyToClipboard(nodeInfo.peer_id)}
                            title="Click to copy"
                        >
                            {nodeInfo.peer_id}
                        </div>
                        
                        {/* Full Address Toggle */}
                        <button 
                            className="text-xs text-blue-400 hover:underline"
                            onClick={() => setShowFullAddress(!showFullAddress)}
                        >
                            {showFullAddress ? 'Hide' : 'Show'} Full Address
                        </button>
                        
                        {showFullAddress && nodeInfo.full_addresses.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-xs text-gray-400">Full Addresses (share for connection):</div>
                                {nodeInfo.full_addresses.map((addr, i) => (
                                    <div 
                                        key={i}
                                        className="bg-black/20 p-2 rounded text-xs font-mono break-all cursor-pointer hover:bg-black/30"
                                        onClick={() => copyToClipboard(addr)}
                                        title="Click to copy"
                                    >
                                        {addr}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-gray-400">
                        Loading P2P node info...
                    </div>
                )}
                {/* Connect to Peer Form */}
                <div className="space-y-2">
                    <div className="text-xs text-gray-400">Connect to Peer:</div>
                    <div className="flex gap-2">
                        <Input
                            value={peerAddress}
                            onChange={(e) => setPeerAddress(e.target.value)}
                            placeholder="/ip4/192.168.x.x/tcp/8000/p2p/..."
                            className="text-xs flex-1"
                        />
                        <Button 
                            onClick={handleConnect}
                            disabled={isConnecting || !peerAddress.trim()}
                            variant="outline"
                            size="sm"
                        >
                            {isConnecting ? '...' : 'Connect'}
                        </Button>
                    </div>
                </div>
                {/* Connected Peers */}
                <div className="space-y-2">
                    <div className="text-xs text-gray-400">
                        Connected Peers ({peerCount}):
                    </div>
                    {knownPeers.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {knownPeers.map((peer) => (
                                <div 
                                    key={peer.peer_id}
                                    className="bg-black/20 p-2 rounded text-xs"
                                >
                                    <div className="font-mono truncate">
                                        {peer.peer_id.slice(0, 20)}...
                                    </div>
                                    <div className="text-gray-500 text-[10px]">
                                        Last seen: {new Date(peer.last_seen).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 italic">
                            No peers connected yet
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

