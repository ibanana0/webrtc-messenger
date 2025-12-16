import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface Message {
    username: string,
    message: string,
    timestamp: string,
    from_peer?: boolean,
    peer_id?: string,
}

interface NodeInfo {
    peer_id: string
    addresses: string[]
    full_addresses: string[]
}

interface PeerInfo {
    peer_id: string
    addresses: string[]
    last_seen: string
}

interface PeerConnectionStatus {
    success: boolean
    address: string
    message?: string
    error?: string
}

export function useWebsocket(username: string) {
    const socketRef = useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [onlineUsers, setOnlineUsers] = useState<String[]>([])

    // P2P related states
    const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null)
    const [knownPeers, setKnownPeers] = useState<PeerInfo[]>([])
    const [peerCount, setPeerCount] = useState(0)

    useEffect(() => {
        // Dynamic backend URL - can be overridden via localStorage
        const getSocketUrl = () => {
            const customUrl = localStorage.getItem('backendUrl')
            if (customUrl) return customUrl
            return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        }

        const SOCKET_URL = getSocketUrl()
        console.log('Connecting to WebSocket:', SOCKET_URL)

        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        socketRef.current.on('connect', () => {
            console.log('WebSocket connected')
            setIsConnected(true)
            socketRef.current?.emit('join', { username })

            // Request P2P info after a short delay (node might still be starting)
            setTimeout(() => {
                socketRef.current?.emit('get_p2p_info')
            }, 2000)
        })

        socketRef.current.on('disconnect', () => {
            console.log('WebSocket disconnected')
            setIsConnected(false)
        })

        socketRef.current.on('connect_error', (error) => {
            console.error('Connection error:', error)
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

        socketRef.current.on('p2p_status', (data: { is_running: boolean; node_info: NodeInfo }) => {
            console.log('P2P Status:', data)
            if (data.node_info) {
                setNodeInfo(data.node_info)
            }
        })

        socketRef.current.on('p2p_info', (data: {
            node_info: NodeInfo
            peer_count?: number
            known_peers?: PeerInfo[]
        }) => {
            console.log('P2P Info:', data)
            setNodeInfo(data.node_info)
            if (data.peer_count !== undefined) {
                setPeerCount(data.peer_count)
            }
            if (data.known_peers) {
                setKnownPeers(data.known_peers)
            }
        })

        socketRef.current.on('peer_connection_status', (data: PeerConnectionStatus) => {
            console.log('Peer connection status:', data)
            if (data.success) {
                // Request updated peer list
                socketRef.current?.emit('get_p2p_info')
            }
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

    const connectToPeer = useCallback((address: string) => {
        if (socketRef.current && address.trim()) {
            socketRef.current.emit('connect_peer', { address })
        }
    }, [])

    const refreshP2PInfo = useCallback(() => {
        socketRef.current?.emit('get_p2p_info')
    }, [])
    return {
        isConnected,

        messages,
        onlineUsers,
        sendMessage,

        nodeInfo,
        knownPeers,
        peerCount,

        connectToPeer,
        refreshP2PInfo,
    }
}