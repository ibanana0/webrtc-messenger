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

export default function ChatPage() {
    const router = useRouter()
    const user = useAuthStore(state => state.user)
    const logout = useAuthStore(state => state.logout)
    const hasHydrated = useAuthStore(state => state._hasHydrated)
    const [inputMessage, setInputMessage] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [showP2PPanel, setShowP2PPanel] = useState(false)

    // Redirect if not logged in - wait for hydration first
    useEffect(() => {
        if (hasHydrated && !user) {
            router.push('/login')
        }
    }, [user, router, hasHydrated])

    const {
        isConnected,
        messages,
        onlineUsers,
        sendMessage,
        nodeInfo,
        knownPeers,
        peerCount,
        connectToPeer,
        refreshP2PInfo
    } = useWebsocket(user?.username || '')

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])
    const handleSend = (e: React.FormEvent) => {
        e.preventDefault()
        if (inputMessage.trim()) {
            sendMessage(inputMessage)
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
                {/* Background */}
                <div className="fixed inset-0 w-screen h-screen">
                    <LiquidEther colors={['#5227FF', '#FF9FFC', '#B19EEF']} />
                </div>
                {/* Chat UI */}
                <div className="relative z-10 flex flex-col h-screen p-4">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-xl font-bold">Chat</h1>
                            <p className="text-sm text-gray-400">
                                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                                {' · '}{onlineUsers.length} online
                                {peerCount > 0 && ` · ${peerCount} P2P peers`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setShowP2PPanel(!showP2PPanel)}
                                className={showP2PPanel ? 'bg-blue-600/20' : ''}
                            >
                                🔗 P2P
                            </Button>
                            <Button variant="ghost" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    </div>
                    {/* Main Content */}
                    <div className="flex flex-1 gap-4 overflow-hidden">
                        {/* Messages Panel */}
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
                                                    ? 'bg-purple-700/80'  // P2P messages styled differently
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
                        {/* P2P Panel - Shown when toggled */}
                        {showP2PPanel && (
                            <div className="w-80 hidden lg:block">
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
                    {/* Input */}
                    <form onSubmit={handleSend} className="flex gap-2 mt-4">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1"
                        />
                        <Button type="submit" variant="outline">
                            Send
                        </Button>
                    </form>
                    {/* Mobile P2P Panel */}
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