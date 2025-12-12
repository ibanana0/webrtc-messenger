import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface Message {
    username: string,
    message: string,
    timestamp: string
}

export function useWebsocket(username: string) {
    const socketRef = useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [onlineUsers, setOnlineUsers] = useState<String[]>([])

    useEffect(() => {
        // connect ke backend

        socketRef.current = io('http://localhost:8080', {
            transports: ['websocket']
        })

        socketRef.current.on('connect', () => {
            setIsConnected(true)
            socketRef.current?.emit('join', { username })
        })

        socketRef.current.on('disconnect', () => {
            setIsConnected(false)
        })

        socketRef.current.on('receive_message', (data: Message) => {
            setMessages(prev => [...prev, data])
        })

        socketRef.current.on('online_users', (data: { users: string[] }) => {
            setOnlineUsers(data.users)
        })

        socketRef.current.on('user_joined', (data: { username: string }) => {
            console.log(`${data.username} joined`)
        })

        socketRef.current.on('user_left', (data: { username: string }) => {
            console.log(`${data.username} left`)
        })

        return () => {
            socketRef.current?.emit('leave', { username })
            socketRef.current?.disconnect()
        }
    }, [username])

    const sendMessage = useCallback((message: string) => {
        if (socketRef.current && message.trim()) {
            socketRef.current.emit('send_message', {
                username,
                message,
                timestamp: new Date().toISOString()
            })
        }
    }, [username])

    return { isConnected, messages, onlineUsers, sendMessage }
}