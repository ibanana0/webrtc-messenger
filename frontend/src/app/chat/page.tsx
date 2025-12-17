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
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)
    const [manualRecipient, setManualRecipient] = useState('')
    const [showManualInput, setShowManualInput] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [showP2PPanel, setShowP2PPanel] = useState(false)

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
        sendDirectMessage,
        nodeInfo,
        knownPeers,
        peerCount,
        connectToPeer,
        refreshP2PInfo,
        p2pEvents,
        clearP2PEvents,
    } = useWebsocket(user?.username || '')

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (inputMessage.trim()) {
            if (selectedRecipient) {
                sendDirectMessage(inputMessage, selectedRecipient)
            } else {
                sendMessage(inputMessage)
            }
            setInputMessage('')
            // Don't clear recipient - keep it for subsequent messages
        }
    }

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    const otherUsers = onlineUsers.filter(u => u !== user?.username)

    if (!user) return null
    return (
        <PageTransition>
            {/* Fixed viewport - NO PAGE SCROLL */}
            <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0">
                    <LiquidEther colors={['#5227FF', '#FF9FFC', '#B19EEF']} />
                </div>

                {/* Main layout container - fills viewport, no scroll */}
                <div className="relative z-10 flex flex-col h-full p-2 sm:p-3 md:p-4 overflow-hidden">
                    {/* Header - fixed height */}
                    <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2 flex-shrink-0">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg md:text-xl font-bold truncate">Chat</h1>
                            <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">
                                {isConnected ? '🟢' : '🔴'}
                                {' '}{onlineUsers.length} online
                                {peerCount > 0 && ` · ${peerCount} P2P`}
                            </p>
                        </div>
                        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                            <P2PStatusBadge
                                isConnected={isConnected}
                                peerCount={peerCount}
                                onClick={() => setShowP2PPanel(!showP2PPanel)}
                            />
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="text-xs sm:text-sm px-2 sm:px-3"
                            >
                                <span className="hidden sm:inline">Logout</span>
                                <span className="sm:hidden">↗️</span>
                            </Button>
                        </div>
                    </div>

                    {/* Main content - takes remaining space */}
                    <div className="flex flex-1 gap-2 sm:gap-3 md:gap-4 min-h-0 overflow-hidden">
                        {/* Left side: Chat + Input */}
                        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                            {/* Messages area - ONLY THIS SCROLLS */}
                            <Card className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 backdrop-blur-xl min-h-0">
                                {messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                                        <p>No messages yet. Start chatting!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 sm:space-y-3">
                                        {messages.map((msg, i) => (
                                            <div
                                                key={i}
                                                className={`${msg.username === user.username ? 'text-right' : ''}`}
                                            >
                                                <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1">
                                                    <span className="truncate">{msg.username}</span>
                                                    {msg.isDM && (
                                                        <span className="ml-1 text-green-400" title="Direct Message (E2E Encrypted)">
                                                            🔒
                                                            <span className="hidden sm:inline">
                                                                {msg.recipient && msg.username === user.username ? ` → ${msg.recipient}` : ' DM'}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {msg.from_peer && (
                                                        <span className="ml-1 text-blue-400" title="From P2P peer">
                                                            🔗
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`inline-block px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm max-w-[85%] sm:max-w-[80%] break-words ${msg.username === user.username
                                                    ? msg.isDM
                                                        ? 'bg-green-700'
                                                        : 'bg-blue-600'
                                                    : msg.isDM
                                                        ? 'bg-green-800/80'
                                                        : msg.from_peer
                                                            ? 'bg-purple-700/80'
                                                            : 'bg-gray-700'
                                                    }`}>
                                                    {msg.message}
                                                </p>
                                                <div className="text-[8px] sm:text-[10px] text-gray-500 mt-0.5">
                                                    {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </Card>

                            {/* Input form - fixed at bottom of chat area */}
                            <form onSubmit={handleSend} className="mt-2 flex-shrink-0">
                                {/* DM Selector */}
                                <div className="flex gap-1 sm:gap-2 mb-1.5 items-center overflow-x-auto pb-1 scrollbar-thin">
                                    <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">To:</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedRecipient(null)
                                            setShowManualInput(false)
                                        }}
                                        className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs transition-all flex-shrink-0 ${selectedRecipient === null && !showManualInput
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                            }`}
                                    >
                                        📢 <span className="hidden sm:inline">Everyone</span><span className="sm:hidden">All</span>
                                    </button>
                                    {otherUsers.map(otherUser => (
                                        <button
                                            key={String(otherUser)}
                                            type="button"
                                            onClick={() => {
                                                setSelectedRecipient(String(otherUser))
                                                setShowManualInput(false)
                                            }}
                                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs transition-all flex-shrink-0 ${selectedRecipient === otherUser && !showManualInput
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                                }`}
                                        >
                                            🔒 {String(otherUser)}
                                        </button>
                                    ))}
                                    {/* Manual Input Button - untuk user dari node lain */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowManualInput(!showManualInput)
                                            if (!showManualInput) {
                                                setSelectedRecipient(null)
                                            }
                                        }}
                                        className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs transition-all flex-shrink-0 ${showManualInput
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                            }`}
                                        title="Kirim DM ke user dari node lain"
                                    >
                                        ✏️ <span className="hidden sm:inline">Manual</span>
                                    </button>
                                </div>

                                {/* Manual Recipient Input */}
                                {showManualInput && (
                                    <div className="flex gap-1.5 mb-1.5 items-center">
                                        <span className="text-[10px] text-purple-400">🔒 DM to:</span>
                                        <input
                                            type="text"
                                            value={manualRecipient}
                                            onChange={(e) => setManualRecipient(e.target.value.toLowerCase())}
                                            placeholder="username..."
                                            className="flex-1 px-2 py-0.5 bg-gray-800/50 border border-purple-500/50 rounded text-xs focus:outline-none focus:border-purple-400"
                                        />
                                        {manualRecipient && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedRecipient(manualRecipient)
                                                    setShowManualInput(false)
                                                }}
                                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 rounded text-[10px]"
                                            >
                                                Set
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-1.5 sm:gap-2">
                                    <Input
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder={selectedRecipient ? `🔒 to ${selectedRecipient}` : "Message..."}
                                        className="flex-1 text-xs sm:text-sm min-w-0"
                                    />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="flex items-center gap-1 sm:gap-2 flex-shrink-0 px-2 sm:px-3 text-xs sm:text-sm"
                                    >
                                        <span className="hidden sm:inline">{selectedRecipient ? '🔒 DM' : '📤 Send'}</span>
                                        <span className="sm:hidden">{selectedRecipient ? '🔒' : '📤'}</span>
                                    </Button>
                                </div>

                                {selectedRecipient && (
                                    <p className="hidden sm:block text-[10px] text-green-400 mt-1">
                                        🔐 E2E encrypted with {selectedRecipient}'s key
                                    </p>
                                )}
                            </form>
                        </div>

                        {/* Right side: P2P Panel (desktop sidebar) - scrollable independently */}
                        {showP2PPanel && (
                            <div className="hidden xl:flex xl:flex-col w-64 2xl:w-80 flex-shrink-0 overflow-y-auto space-y-2">
                                <PeerConnection
                                    nodeInfo={nodeInfo}
                                    knownPeers={knownPeers}
                                    peerCount={peerCount}
                                    onConnectPeer={connectToPeer}
                                    onRefresh={refreshP2PInfo}
                                />
                                <P2PEventLog
                                    events={p2pEvents}
                                    onClear={clearP2PEvents}
                                />
                            </div>
                        )}

                        {/* Mobile P2P Panel - shows as right column, also scrolls independently */}
                        {showP2PPanel && (
                            <div className="xl:hidden w-48 sm:w-56 flex-shrink-0 overflow-y-auto space-y-2">
                                <PeerConnection
                                    nodeInfo={nodeInfo}
                                    knownPeers={knownPeers}
                                    peerCount={peerCount}
                                    onConnectPeer={connectToPeer}
                                    onRefresh={refreshP2PInfo}
                                />
                                <P2PEventLog
                                    events={p2pEvents}
                                    onClear={clearP2PEvents}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageTransition>
    )
}