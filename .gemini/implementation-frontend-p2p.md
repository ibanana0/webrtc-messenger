# Implementation Plan: Frontend P2P Connection

## Overview

Dokumen ini berisi implementasi lengkap untuk frontend P2P connection pada aplikasi P2P Messager. Saat ini, frontend hanya memiliki implementasi dasar untuk chat dan panel P2P sederhana. Dokumen ini menjelaskan cara meningkatkan pengalaman P2P dengan komponen-komponen dedicated.

## Current State

**Yang Sudah Ada:**
- `useSocket.ts` - Hook untuk mengelola WebSocket connection dan P2P events dasar
- `PeerConnection.tsx` - Komponen UI untuk P2P panel (sidebar)
- `chat/page.tsx` - Halaman chat yang mengintegrasikan keduanya

**Yang Perlu Ditambahkan:**
1. Halaman dedicated untuk P2P Network management
2. Event handling yang lebih lengkap di useSocket
3. Komponen P2P Status Badge untuk header
4. Komponen P2P Event Log untuk monitoring realtime

---

## 1. Halaman P2P Network

### File: `frontend/src/app/p2p/page.tsx`

Halaman khusus untuk mengelola koneksi P2P dengan fitur:
- Menampilkan status node P2P secara lengkap
- Panel untuk menghubungkan ke peer lain
- Daftar peers yang terhubung dengan detail lengkap
- Statistik jaringan P2P

```tsx
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

/**
 * Halaman khusus untuk mengelola koneksi P2P.
 * 
 * Penjelasan:
 * - Menampilkan status node P2P secara lengkap
 * - Panel untuk menghubungkan ke peer lain
 * - Daftar peers yang terhubung dengan detail lengkap
 * - Statistik jaringan P2P
 */
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

    /**
     * Handler untuk connect ke peer.
     * 
     * Penjelasan:
     * - Memvalidasi input tidak kosong
     * - Memanggil connectToPeer dari useWebsocket
     * - Menampilkan feedback loading dan hasil
     */
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

    /**
     * Fungsi untuk copy text ke clipboard.
     */
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            // Opsional: Tambahkan toast notification disini
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    if (!user) return null

    return (
        <PageTransition>
            <div className="relative min-h-screen overflow-hidden">
                {/* Background */}
                <div className="fixed inset-0 w-screen h-screen">
                    <LiquidEther colors={['#5227FF', '#FF9FFC', '#B19EEF']} />
                </div>

                {/* Main Content */}
                <div className="relative z-10 p-6 max-w-4xl mx-auto">
                    {/* Header */}
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

                    {/* Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Node Info Card */}
                        <Card className="backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Your Node Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {nodeInfo ? (
                                    <>
                                        {/* Peer ID */}
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

                                        {/* Local Addresses */}
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

                                        {/* Full Addresses (untuk sharing) */}
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

                        {/* Connect to Peer Card */}
                        <Card className="backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Connect to Peer</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-400">
                                    Enter a peer's full address to establish a P2P connection.
                                </p>
                                
                                {/* Input Form */}
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

                                {/* Connection Result */}
                                {connectionResult && (
                                    <div className={`p-3 rounded-lg text-sm ${
                                        connectionResult.success 
                                            ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                                            : 'bg-red-900/30 text-red-400 border border-red-500/30'
                                    }`}>
                                        {connectionResult.success ? '✅' : '❌'} {connectionResult.message}
                                    </div>
                                )}

                                {/* Tips */}
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

                        {/* Connected Peers Card */}
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
```

### Penjelasan Komponen:

| Bagian | Penjelasan |
|--------|------------|
| **State Management** | `peerAddress` menyimpan input, `isConnecting` untuk loading, `connectionResult` untuk feedback |
| **useWebsocket Hook** | Mengambil `nodeInfo`, `knownPeers`, `peerCount`, `connectToPeer`, `refreshP2PInfo` |
| **Node Info Card** | Menampilkan Peer ID dan alamat node Anda |
| **Connect Card** | Form untuk menghubungkan ke peer lain dengan tips |
| **Peers Card** | Grid menampilkan semua peer yang terhubung |

---

## 2. Peningkatan useSocket.ts

### File: `frontend/src/lib/useSocket.ts`

Tambahkan interface dan event handling untuk P2P events yang lebih lengkap.

### Tambahan Interface:

```typescript
// Tambahkan setelah interface PeerConnectionStatus (line 24-29)

interface P2PEvent {
    type: 'peer_connected' | 'peer_disconnected' | 'message_from_peer'
    peer_id: string
    data?: any
    timestamp: string
}

interface ConnectionHistoryItem {
    address: string
    status: 'success' | 'failed' | 'pending'
    timestamp: Date
    error?: string
}
```

### Tambahan State:

```typescript
// Tambahkan setelah state peerCount (line 40)

const [p2pEvents, setP2pEvents] = useState<P2PEvent[]>([])
const [connectionHistory, setConnectionHistory] = useState<ConnectionHistoryItem[]>([])
```

### Tambahan Event Listeners:

```typescript
// Tambahkan di dalam useEffect, setelah peer_connection_status handler (setelah line 124)

// Event: Peer baru terhubung
socketRef.current.on('peer_connected', (data: { peer_id: string }) => {
    console.log('New peer connected:', data.peer_id)
    setP2pEvents(prev => [...prev, {
        type: 'peer_connected',
        peer_id: data.peer_id,
        timestamp: new Date().toISOString()
    }])
    // Auto refresh peer list
    socketRef.current?.emit('get_p2p_info')
})

// Event: Peer terputus
socketRef.current.on('peer_disconnected', (data: { peer_id: string }) => {
    console.log('Peer disconnected:', data.peer_id)
    setP2pEvents(prev => [...prev, {
        type: 'peer_disconnected',
        peer_id: data.peer_id,
        timestamp: new Date().toISOString()
    }])
    // Auto refresh peer list
    socketRef.current?.emit('get_p2p_info')
})
```

### Update peer_connection_status Handler:

```typescript
// Ganti handler peer_connection_status yang ada (line 118-124) dengan:

socketRef.current.on('peer_connection_status', (data: PeerConnectionStatus) => {
    console.log('Peer connection status:', data)
    
    // Simpan ke connection history
    setConnectionHistory(prev => [...prev, {
        address: data.address,
        status: data.success ? 'success' : 'failed',
        timestamp: new Date(),
        error: data.error
    }])
    
    if (data.success) {
        // Request updated peer list
        socketRef.current?.emit('get_p2p_info')
    }
})
```

### Tambahan Functions:

```typescript
// Tambahkan setelah refreshP2PInfo (line 148-150)

const clearP2PEvents = useCallback(() => {
    setP2pEvents([])
}, [])

const clearConnectionHistory = useCallback(() => {
    setConnectionHistory([])
}, [])
```

### Update Return Statement:

```typescript
// Update return statement (line 151-165) menjadi:

return {
    // Connection status
    isConnected,

    // Chat
    messages,
    onlineUsers,
    sendMessage,

    // P2P Node Info
    nodeInfo,
    knownPeers,
    peerCount,

    // P2P Actions
    connectToPeer,
    refreshP2PInfo,

    // P2P Events & History (BARU)
    p2pEvents,
    connectionHistory,
    clearP2PEvents,
    clearConnectionHistory,
}
```

### Penjelasan:

| Fitur | Penjelasan |
|-------|------------|
| `p2pEvents` | Array menyimpan semua event P2P (connect/disconnect) untuk ditampilkan di event log |
| `connectionHistory` | Array menyimpan history percobaan koneksi beserta hasilnya |
| `peer_connected` event | Listener untuk event saat peer baru terhubung |
| `peer_disconnected` event | Listener untuk event saat peer terputus |
| `clearP2PEvents` | Fungsi untuk membersihkan event log |
| `clearConnectionHistory` | Fungsi untuk membersihkan connection history |

---

## 3. Komponen P2P Status Badge

### File: `frontend/src/components/ui/P2PStatusBadge.tsx`

Komponen kecil untuk menampilkan status P2P di navbar atau header.

```tsx
'use client'

interface P2PStatusBadgeProps {
    /** Status koneksi ke server */
    isConnected: boolean
    /** Jumlah peer yang terhubung */
    peerCount: number
    /** Callback saat badge diklik */
    onClick?: () => void
}

/**
 * Badge untuk menampilkan status P2P connection.
 * 
 * Penjelasan:
 * - Menampilkan status koneksi (connected/disconnected)
 * - Menampilkan jumlah peer yang terhubung
 * - Klik untuk toggle P2P panel atau navigate
 * 
 * Warna Status:
 * - Hijau (🟢): Connected dengan peers aktif
 * - Kuning (🟡): Connected ke server tapi tanpa peers
 * - Merah (🔴): Disconnected dari server
 */
export function P2PStatusBadge({ isConnected, peerCount, onClick }: P2PStatusBadgeProps) {
    /**
     * Menentukan warna berdasarkan status.
     */
    const getStatusColor = () => {
        if (!isConnected) return 'bg-red-500/20 text-red-400 border-red-500/30'
        if (peerCount > 0) return 'bg-green-500/20 text-green-400 border-green-500/30'
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }

    /**
     * Menentukan icon berdasarkan status.
     */
    const getStatusIcon = () => {
        if (!isConnected) return '🔴'
        if (peerCount > 0) return '🟢'
        return '🟡'
    }

    /**
     * Menentukan text status.
     */
    const getStatusText = () => {
        if (!isConnected) return 'Offline'
        if (peerCount > 0) return `${peerCount} peer${peerCount > 1 ? 's' : ''}`
        return 'No peers'
    }

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                border backdrop-blur-sm transition-all
                hover:scale-105 active:scale-95
                ${getStatusColor()}
            `}
            title="Click to view P2P Network status"
        >
            <span>{getStatusIcon()}</span>
            <span>{getStatusText()}</span>
            <span className="text-xs opacity-60">🔗</span>
        </button>
    )
}
```

### Cara Penggunaan:

```tsx
// Di header atau navbar component
import { P2PStatusBadge } from '@/components/ui/P2PStatusBadge'
import { useWebsocket } from '@/lib/useSocket'

function Header() {
    const { isConnected, peerCount } = useWebsocket(username)
    const router = useRouter()

    return (
        <header>
            {/* ... other header content ... */}
            <P2PStatusBadge 
                isConnected={isConnected}
                peerCount={peerCount}
                onClick={() => router.push('/p2p')}
            />
        </header>
    )
}
```

---

## 4. Komponen P2P Event Log

### File: `frontend/src/components/ui/P2PEventLog.tsx`

Komponen untuk menampilkan log events P2P secara realtime.

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass/card'

interface P2PEvent {
    type: 'peer_connected' | 'peer_disconnected' | 'message_from_peer' | string
    peer_id: string
    data?: any
    timestamp: string
}

interface P2PEventLogProps {
    /** Array of P2P events to display */
    events: P2PEvent[]
    /** Callback to clear the event log */
    onClear?: () => void
    /** Maximum number of events to display (default: 50) */
    maxEvents?: number
}

/**
 * Komponen untuk menampilkan log events P2P secara realtime.
 * 
 * Penjelasan:
 * - Menampilkan daftar event dengan warna berbeda per tipe
 * - Auto-scroll ke event terbaru
 * - Opsi untuk clear log
 * 
 * Tipe Event yang Didukung:
 * - peer_connected: Peer baru terhubung (hijau)
 * - peer_disconnected: Peer terputus (merah)
 * - message_from_peer: Pesan dari peer (biru)
 */
export function P2PEventLog({ events, onClear, maxEvents = 50 }: P2PEventLogProps) {
    const logEndRef = useRef<HTMLDivElement>(null)

    /**
     * Auto scroll ke bawah saat ada event baru.
     */
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [events])

    /**
     * Mendapatkan style (icon, warna) berdasarkan tipe event.
     */
    const getEventStyle = (type: string) => {
        switch (type) {
            case 'peer_connected':
                return { 
                    icon: '🟢', 
                    color: 'text-green-400', 
                    bg: 'bg-green-900/20',
                    label: 'Peer Connected'
                }
            case 'peer_disconnected':
                return { 
                    icon: '🔴', 
                    color: 'text-red-400', 
                    bg: 'bg-red-900/20',
                    label: 'Peer Disconnected'
                }
            case 'message_from_peer':
                return { 
                    icon: '💬', 
                    color: 'text-blue-400', 
                    bg: 'bg-blue-900/20',
                    label: 'Message from Peer'
                }
            default:
                return { 
                    icon: '📝', 
                    color: 'text-gray-400', 
                    bg: 'bg-gray-900/20',
                    label: type.replace(/_/g, ' ')
                }
        }
    }

    // Ambil events terakhir saja untuk performa
    const displayEvents = events.slice(-maxEvents)

    return (
        <Card className="backdrop-blur-xl">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
                <CardTitle className="text-sm">P2P Event Log</CardTitle>
                {onClear && events.length > 0 && (
                    <button 
                        onClick={onClear}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                )}
            </CardHeader>
            <CardContent>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {displayEvents.length > 0 ? (
                        displayEvents.map((event, i) => {
                            const style = getEventStyle(event.type)
                            return (
                                <div 
                                    key={`${event.timestamp}-${i}`}
                                    className={`${style.bg} p-2 rounded text-xs flex items-start gap-2`}
                                >
                                    <span>{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className={style.color}>
                                            {style.label}
                                        </span>
                                        <span className="text-gray-500 ml-2 truncate block">
                                            {event.peer_id.slice(0, 20)}...
                                        </span>
                                    </div>
                                    <span className="text-gray-600 text-[10px] whitespace-nowrap">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-4 text-gray-500 text-xs">
                            No events yet. Events will appear here when peers connect or disconnect.
                        </div>
                    )}
                    <div ref={logEndRef} />
                </div>
            </CardContent>
        </Card>
    )
}
```

### Cara Penggunaan:

```tsx
// Di halaman P2P atau chat
import { P2PEventLog } from '@/components/ui/P2PEventLog'
import { useWebsocket } from '@/lib/useSocket'

function P2PPage() {
    const { p2pEvents, clearP2PEvents } = useWebsocket(username)

    return (
        <div>
            {/* ... other content ... */}
            <P2PEventLog 
                events={p2pEvents}
                onClear={clearP2PEvents}
                maxEvents={30}
            />
        </div>
    )
}
```

---

## 5. Integrasi ke Chat Page

Untuk mengintegrasikan komponen baru ke halaman chat yang sudah ada.

### Update: `frontend/src/app/chat/page.tsx`

Tambahkan import dan gunakan komponen baru:

```tsx
// Tambahkan import
import { P2PStatusBadge } from '@/components/ui/P2PStatusBadge'
import { P2PEventLog } from '@/components/ui/P2PEventLog'

// Di dalam ChatPage component, update useWebsocket destructuring:
const {
    isConnected,
    messages,
    onlineUsers,
    sendMessage,
    nodeInfo,
    knownPeers,
    peerCount,
    connectToPeer,
    refreshP2PInfo,
    p2pEvents,        // BARU
    clearP2PEvents    // BARU
} = useWebsocket(user?.username || '')

// Di header section, tambahkan P2PStatusBadge:
<div className="flex gap-2">
    <P2PStatusBadge 
        isConnected={isConnected}
        peerCount={peerCount}
        onClick={() => setShowP2PPanel(!showP2PPanel)}
    />
    <Button variant="ghost" onClick={handleLogout}>
        Logout
    </Button>
</div>

// Di P2P Panel section, tambahkan P2PEventLog:
{showP2PPanel && (
    <div className="w-80 hidden lg:block space-y-4">
        <PeerConnection
            nodeInfo={nodeInfo}
            knownPeers={knownPeers}
            peerCount={peerCount}
            onConnectPeer={connectToPeer}
            onRefresh={refreshP2PInfo}
        />
        {/* BARU: Event Log */}
        <P2PEventLog 
            events={p2pEvents}
            onClear={clearP2PEvents}
        />
    </div>
)}
```

---

## Catatan Backend

Untuk fitur `peer_connected` dan `peer_disconnected` events berfungsi, backend perlu mengirim events tersebut. Jika belum ada, tambahkan di `socket_events.py`:

```python
# Di p2p_manager atau gossip_handler, emit event saat peer connect/disconnect:

def on_peer_connected(peer_id: str):
    socketio.emit('peer_connected', {'peer_id': peer_id}, room='main')

def on_peer_disconnected(peer_id: str):
    socketio.emit('peer_disconnected', {'peer_id': peer_id}, room='main')
```

---

## Ringkasan File yang Perlu Dibuat/Dimodifikasi

| File | Action | Deskripsi |
|------|--------|-----------|
| `app/p2p/page.tsx` | **CREATE** | Halaman dedicated untuk P2P Network management |
| `lib/useSocket.ts` | **MODIFY** | Tambah event handling dan state untuk P2P events |
| `components/ui/P2PStatusBadge.tsx` | **CREATE** | Badge komponen untuk menampilkan status P2P |
| `components/ui/P2PEventLog.tsx` | **CREATE** | Komponen untuk menampilkan event log P2P |
| `app/chat/page.tsx` | **MODIFY** | Integrasikan komponen baru |

---

## Testing Checklist

- [ ] Halaman P2P (`/p2p`) dapat diakses setelah login
- [ ] Node info (Peer ID, addresses) ditampilkan dengan benar
- [ ] Full address dapat di-copy ke clipboard
- [ ] Form connect dapat menginput address dan menghubungi peer
- [ ] Daftar connected peers di-update setelah koneksi berhasil
- [ ] P2P Status Badge menampilkan status yang benar
- [ ] P2P Event Log menampilkan events saat peer connect/disconnect
- [ ] Semua komponen responsive (mobile & desktop)
