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
export default function ChatPage() {
    const router = useRouter()
    const user = useAuthStore(state => state.user)
    const logout = useAuthStore(state => state.logout)
    const [inputMessage, setInputMessage] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            router.push('/login')
        }
    }, [user, router])
    const { isConnected, messages, onlineUsers, sendMessage } = useWebsocket(user?.username || '')
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
                    <LiquidEther
                        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
                    />
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
                            </p>
                        </div>
                        <Button variant="ghost" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                    {/* Messages */}
                    <Card className="flex-1 overflow-y-auto p-4 backdrop-blur-xl mb-4">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`mb-2 ${msg.username === user.username ? 'text-right' : ''}`}
                            >
                                <span className="text-xs text-gray-400">{msg.username}</span>
                                <p className={`inline-block px-3 py-1 rounded-lg ${msg.username === user.username
                                        ? 'bg-blue-600'
                                        : 'bg-gray-700'
                                    }`}>
                                    {msg.message}
                                </p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </Card>
                    {/* Input */}
                    <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1"
                        />
                        <Button type="submit" variant={'outline'}>Send</Button>
                    </form>
                </div>
            </div>
        </PageTransition>
    )
}