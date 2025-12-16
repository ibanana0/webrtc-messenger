'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/glass/button'
import { Input } from '@/components/ui/glass/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass/card'
interface PeerConnectionProps {
    nodeInfo: {
        peer_id: string
        addresses: string[]
        full_addresses: string[]
    } | null

    knownPeers: Array<{
        peer_id: string
        addresses: string[]
        last_seen: string
    }>

    peerCount: number

    onConnectPeer: (address: string) => void

    onRefresh: () => void
}

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

    const handleConnect = async () => {
        if (!peerAddress.trim()) return

        setIsConnecting(true)
        try {
            onConnectPeer(peerAddress)
            setPeerAddress('')
        } finally {
            setTimeout(() => setIsConnecting(false), 2000)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
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

