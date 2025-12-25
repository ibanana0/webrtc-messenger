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
            <CardHeader className="pb-1 sm:pb-2 px-2 sm:px-4 pt-2 sm:pt-4">
                <div className="flex justify-between items-center gap-2">
                    <CardTitle className="text-sm sm:text-base md:text-lg truncate">P2P Network</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                        className="text-[10px] sm:text-xs px-1.5 sm:px-2 flex-shrink-0"
                    >
                        🔄 <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-2 sm:space-y-3 md:space-y-4 px-2 sm:px-4 pb-2 sm:pb-4">
                {nodeInfo ? (
                    <div className="space-y-1.5 sm:space-y-2">
                        <div className="text-[10px] sm:text-xs text-gray-400">Your Peer ID:</div>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                            {nodeInfo.full_addresses.map((addr, i) => (
                                <div
                                    key={i}
                                    className="bg-black/20 p-1.5 sm:p-2 rounded text-[9px] sm:text-[10px] font-mono break-all cursor-pointer hover:bg-black/30"
                                    onClick={() => copyToClipboard(addr)}
                                    title="Click to copy"
                                >
                                    {addr}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs sm:text-sm text-gray-400">
                        Loading P2P node info...
                    </div>
                )}

                <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-[10px] sm:text-xs text-gray-400">Connect to Peer:</div>
                    <div className="flex gap-1.5 sm:gap-2">
                        <Input
                            value={peerAddress}
                            onChange={(e) => setPeerAddress(e.target.value)}
                            placeholder="/ip4/.../p2p/..."
                            className="text-[10px] sm:text-xs flex-1 min-w-0 opacity-30"
                        />
                        <Button
                            onClick={handleConnect}
                            disabled={isConnecting || !peerAddress.trim()}
                            variant="outline"
                            size="sm"
                            className="text-[10px] sm:text-xs px-2 sm:px-3 flex-shrink-0"
                        >
                            {isConnecting ? '...' : 'Connect'}
                        </Button>
                    </div>
                </div>


                <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-[10px] sm:text-xs text-gray-400">
                        Connected Peers ({peerCount}):
                    </div>
                    {knownPeers.length > 0 ? (
                        <div className="space-y-1 max-h-20 sm:max-h-24 md:max-h-32 overflow-y-auto">
                            {knownPeers.map((peer) => (
                                <div
                                    key={peer.peer_id}
                                    className="bg-black/20 p-1.5 sm:p-2 rounded text-[10px] sm:text-xs"
                                >
                                    <div className="font-mono truncate">
                                        {peer.peer_id.slice(0, 16)}...
                                    </div>
                                    <div className="text-gray-500 text-[8px] sm:text-[10px]">
                                        {new Date(peer.last_seen).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[10px] sm:text-xs text-gray-500 italic">
                            No peers connected
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
