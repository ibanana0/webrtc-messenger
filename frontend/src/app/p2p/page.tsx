'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useWebsocket } from '@/lib/useSocket'
import { Button } from '@/components/ui/glass/button'
import { Input } from '@/components/ui/glass/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass/card'
import { PageTransition } from '@/components/ui/page-transition'
import LiquidEther from '@/components/ui/react-bits/LiquidEther'

export default function P2PPage() {
    const router = useRouter()
    const user = useAuthStore(state => state.user)
    const hasHydrated = useAuthStore(state => state._hasHydrated)
    
    // State untuk input peer address
    const [peerAddress, setPeerAddress] = useState('')
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionResult, setConnectionResult] = useState<{
        success: boolean
        message: string
    } | null>(null)

    // Redirect if not logged in
    useEffect(() => {
        if (hasHydrated && !user) {
            router.push('/login')
        }
    }, [user, router, hasHydrated])

    // Menggunakan hook useWebsocket untuk mendapatkan data P2P
    const {
        isConnected,
        nodeInfo,
        knownPeers,
        peerCount,
        connectToPeer,
        refreshP2PInfo
    } = useWebsocket(user?.username || '')

    const handleConnect = async () => {
        if (!peerAddress.trim()) return
        
        setIsConnecting(true)
        setConnectionResult(null)
        
        try {
            connectToPeer(peerAddress)
            setConnectionResult({
                success: true,
                message: `Connecting to ${peerAddress.slice(0, 30)}...`
            })
            setPeerAddress('')
        } catch (error) {
            setConnectionResult({
                success: false,
                message: `Failed to connect: ${error}`
            })
        } finally {
            setTimeout(() => {
                setIsConnecting(false)
                // Refresh P2P info setelah connect
                refreshP2PInfo()
            }, 2000)
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    if (!user) return null

    return (
        <PageTransition>
            <div className="relative min-h-screen overflow-hidden">
                <div className="fixed inset-0 w-screen h-screen">
                    <LiquidEther colors={['#5227FF', '#FF9FFC', '#B19EEF']} />
                </div>
                <div className="relative z-10 p-6 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">P2P Network</h1>
                            <p className="text-sm text-gray-400">
                                {isConnected ? '🟢 Connected to server' : '🔴 Disconnected'}
                                {peerCount > 0 && ` · ${peerCount} peers`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={refreshP2PInfo}>
                                🔄 Refresh
                            </Button>
                            <Button variant="ghost" onClick={() => router.push('/chat')}>
                                💬 Chat
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Your Node Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {nodeInfo ? (
                                    <>
                                    <div>
                                            <div className="text-xs text-gray-400 mb-1">Peer ID:</div>
                                            <div 
                                                className="bg-black/30 p-3 rounded-lg text-xs font-mono break-all cursor-pointer hover:bg-black/40 transition-colors"
                                                onClick={() => copyToClipboard(nodeInfo.peer_id)}
                                                title="Click to copy"
                                            >
                                                {nodeInfo.peer_id}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">
                                                Local Addresses ({nodeInfo.addresses.length}):
                                            </div>
                                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                                {nodeInfo.addresses.map((addr, i) => (
                                                    <div 
                                                        key={i}
                                                        className="bg-black/20 p-2 rounded text-xs font-mono break-all"
                                                    >
                                                        {addr}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">
                                                Full Addresses (share these to connect):
                                            </div>
                                            <div className="space-y-2">
                                                {nodeInfo.full_addresses.map((addr, i) => (
                                                    <div 
                                                        key={i}
                                                        className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-3 rounded-lg text-xs font-mono break-all cursor-pointer hover:from-blue-900/50 hover:to-purple-900/50 transition-colors border border-blue-500/20"
                                                        onClick={() => copyToClipboard(addr)}
                                                        title="Click to copy"
                                                    >
                                                        📋 {addr}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        Loading node info...
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Connect to Peer</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-400">
                                    Enter a peer's full address to establish a P2P connection.
                                </p>
                                
                                <div className="space-y-2">
                                    <Input
                                        value={peerAddress}
                                        onChange={(e) => setPeerAddress(e.target.value)}
                                        placeholder="/ip4/192.168.x.x/tcp/8000/p2p/12D3..."
                                        className="font-mono text-sm"
                                    />
                                    <Button 
                                        onClick={handleConnect}
                                        disabled={isConnecting || !peerAddress.trim()}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <span className="animate-spin mr-2">⏳</span>
                                                Connecting...
                                            </>
                                        ) : (
                                            '🔗 Connect'
                                        )}
                                    </Button>
                                </div>

                                {connectionResult && (
                                    <div className={`p-3 rounded-lg text-sm ${
                                        connectionResult.success 
                                            ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                                            : 'bg-red-900/30 text-red-400 border border-red-500/30'
                                    }`}>
                                        {connectionResult.success ? '✅' : '❌'} {connectionResult.message}
                                    </div>
                                )}
                                <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/20">
                                    <div className="text-xs text-yellow-400 font-semibold mb-1">💡 Tips:</div>
                                    <ul className="text-xs text-gray-400 space-y-1">
                                        <li>• Full address format: /ip4/IP/tcp/PORT/p2p/PEER_ID</li>
                                        <li>• Both nodes must be running and reachable</li>
                                        <li>• For LAN: Use private IP addresses</li>
                                        <li>• For Internet: Port forwarding may be required</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="backdrop-blur-xl lg:col-span-2">
                            <CardHeader className="flex flex-row justify-between items-center">
                                <CardTitle>Connected Peers ({peerCount})</CardTitle>
                                <Button variant="ghost" size="sm" onClick={refreshP2PInfo}>
                                    🔄 Refresh
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {knownPeers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {knownPeers.map((peer) => (
                                            <div 
                                                key={peer.peer_id}
                                                className="bg-black/20 p-4 rounded-lg border border-white/5"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-gray-400 mb-1">Peer ID:</div>
                                                        <div 
                                                            className="font-mono text-sm truncate cursor-pointer hover:text-blue-400"
                                                            onClick={() => copyToClipboard(peer.peer_id)}
                                                            title={peer.peer_id}
                                                        >
                                                            {peer.peer_id.slice(0, 25)}...
                                                        </div>
                                                    </div>
                                                    <div className="text-green-400 text-xl ml-2">🟢</div>
                                                </div>
                                                
                                                {peer.addresses.length > 0 && (
                                                    <div className="mt-2">
                                                        <div className="text-xs text-gray-400">Addresses:</div>
                                                        {peer.addresses.slice(0, 2).map((addr, i) => (
                                                            <div key={i} className="text-xs font-mono text-gray-500 truncate">
                                                                {addr}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                <div className="mt-2 text-xs text-gray-500">
                                                    Last seen: {new Date(peer.last_seen).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <div className="text-4xl mb-4">🔗</div>
                                        <p>No peers connected yet</p>
                                        <p className="text-sm mt-2">
                                            Share your full address with others or enter a peer's address above
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </PageTransition>
    )
}
