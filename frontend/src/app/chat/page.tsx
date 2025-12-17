'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useWebsocket } from '@/lib/useSocket'
import { Button } from '@/components/ui/glass/button'
import { Input } from '@/components/ui/glass/input'
import { Card } from '@/components/ui/glass/card'
import { PageTransition } from '@/components/ui/page-transition'
import LiquidEther from '@/components/ui/react-bits/LiquidEther'
import { PeerConnection } from '@/components/ui/PeerConnection'
import { P2PStatusBadge } from '@/components/ui/P2PStatusBadge'
import { P2PEventLog } from '@/components/ui/P2PEventLog'

export default function ChatPage() {
    const router = useRouter()
    const user = useAuthStore(state => state.user)
    const logout = useAuthStore(state => state.logout)
    const hasHydrated = useAuthStore(state => state._hasHydrated)
    const [inputMessage, setInputMessage] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [showP2PPanel, setShowP2PPanel] = useState(false)
    const [lastMessageEncrypted, setLastMessageEncrypted] = useState<boolean | null>(null)

    useEffect(() => {
        if (hasHydrated && !user) {
            router.push('/login')
        }
    }, [user, router, hasHydrated])

    const {
        isConnected,
        messages,
        onlineUsers,
        sendMessageWithE2E,  // ✅ Using encrypted version
        nodeInfo,
        knownPeers,
        peerCount,
        connectToPeer,
        refreshP2PInfo,
        p2pEvents,
        clearP2PEvents,
        e2eEnabled,
        e2eStatus
    } = useWebsocket(user?.username || '')

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (inputMessage.trim()) {
            // Use encrypted send - server cannot read message content!
            const result = await sendMessageWithE2E(inputMessage)
            setLastMessageEncrypted(result.encrypted)
            setInputMessage('')
        }
    }

    const handleLogout = () => {
        logout()
        router.push('/login')
    }
    if (!user) return null
    return (
        <PageTransition>
            <div className="relative min-h-screen overflow-hidden">
                <div className="fixed inset-0 w-screen h-screen">
                    <LiquidEther colors={['#5227FF', '#FF9FFC', '#B19EEF']} />
                </div>
                <div className="relative z-10 flex flex-col h-screen p-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-xl font-bold">Chat</h1>
                            <p className="text-sm text-gray-400">
                                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                                {' · '}{onlineUsers.length} online
                                {peerCount > 0 && ` · ${peerCount} P2P peers`}
                                {/* E2E Status Indicator */}
                                {e2eStatus === 'ready' && (
                                    <span className="ml-2 text-green-400" title="End-to-End Encryption Active">
                                        🔐 E2E
                                    </span>
                                )}
                                {e2eStatus === 'not_setup' && (
                                    <span className="ml-2 text-yellow-400" title="E2E not configured - messages sent unencrypted">
                                        ⚠️ No E2E
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {/* E2E Setup Link */}
                            {e2eStatus === 'not_setup' && (
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/e2e-test')}
                                    className="text-yellow-400 hover:text-yellow-300"
                                    title="Setup E2E encryption"
                                >
                                    🔐 Setup E2E
                                </Button>
                            )}
                            <P2PStatusBadge
                                isConnected={isConnected}
                                peerCount={peerCount}
                                onClick={() => setShowP2PPanel(!showP2PPanel)}
                            />
                            <Button variant="ghost" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-1 gap-4 overflow-hidden">
                        <Card className={`flex-1 overflow-y-auto p-4 backdrop-blur-xl ${showP2PPanel ? 'lg:w-2/3' : 'w-full'}`}>
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <p>No messages yet. Start chatting!</p>
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`mb-3 ${msg.username === user.username ? 'text-right' : ''}`}
                                    >
                                        <div className="text-xs text-gray-400 mb-1">
                                            {msg.username}
                                            {msg.from_peer && (
                                                <span className="ml-1 text-blue-400" title="From P2P peer">
                                                    🔗
                                                </span>
                                            )}
                                        </div>
                                        <p className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${msg.username === user.username
                                            ? 'bg-blue-600'
                                            : msg.from_peer
                                                ? 'bg-purple-700/80'
                                                : 'bg-gray-700'
                                            }`}>
                                            {msg.message}
                                        </p>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </Card>
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
                    </div>
                    <form onSubmit={handleSend} className="mt-4">
                        <div className="flex gap-2">
                            <Input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder={e2eEnabled ? "Type a secure message... 🔐" : "Type a message..."}
                                className="flex-1"
                            />
                            <Button type="submit" variant="outline" className="flex items-center gap-2">
                                {e2eEnabled ? '🔐' : '📤'} Send
                            </Button>
                        </div>
                        {/* Encryption status indicator */}
                        <div className="text-xs mt-1 text-gray-500">
                            {e2eEnabled ? (
                                <span className="text-green-400">🔐 Messages are end-to-end encrypted (server cannot read)</span>
                            ) : (
                                <span className="text-yellow-400">⚠️ Messages are not encrypted. <button type="button" onClick={() => router.push('/e2e-test')} className="underline hover:text-yellow-300">Setup E2E</button></span>
                            )}
                        </div>
                    </form>
                    {showP2PPanel && (
                        <div className="lg:hidden mt-4">
                            <PeerConnection
                                nodeInfo={nodeInfo}
                                knownPeers={knownPeers}
                                peerCount={peerCount}
                                onConnectPeer={connectToPeer}
                                onRefresh={refreshP2PInfo}
                            />
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    )
}