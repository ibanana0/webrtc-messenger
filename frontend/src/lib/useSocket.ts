import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { encryptMessage, decryptMessage, EncryptedPayload } from './crypto'
import { getPrivateKey, getCachedRecipientKey, cacheRecipientKey } from './keyStore'
import { keysApi } from './api'

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

export function useWebsocket(username: string) {
    const socketRef = useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [onlineUsers, setOnlineUsers] = useState<String[]>([])

    // P2P related states
    const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null)
    const [knownPeers, setKnownPeers] = useState<PeerInfo[]>([])
    const [peerCount, setPeerCount] = useState(0)
    const [p2pEvents, setP2pEvents] = useState<P2PEvent[]>([])
    const [connectionHistory, setConnectionHistory] = useState<ConnectionHistoryItem[]>([])

    const [e2eEnabled, setE2eEnabled] = useState(false)
    const privateKeyRef = useRef<string | null>(null)

    const sendEncryptedMessage = async (recipientUsername: string, message: string) => {
        if (!socketRef.current) return
        
        try {
            let recipientPublicKey = getCachedRecipientKey(recipientUsername)
            
            if (!recipientPublicKey) {
                const { data, error } = await keysApi.getPublicKey(recipientUsername)
                
                if (error || !data?.public_key) {
                    console.error('Recipient has no public key, sending unencrypted')
                    sendMessage(message)
                    return
                }
                
                recipientPublicKey = data.public_key
                cacheRecipientKey(recipientUsername, recipientPublicKey)
            }
            
            const encryptedPayload = await encryptMessage(message, recipientPublicKey)
            
            socketRef.current.emit('send_message', {
                message: JSON.stringify(encryptedPayload), 
                encrypted: true,
                recipient: recipientUsername
            })
            
            console.log('Encrypted message sent to:', recipientUsername)
            
        } catch (error) {
            console.error('Failed to send encrypted message:', error)
        }
    }

    useEffect(() => {
        const loadPrivateKey = async () => {
            const privateKey = await getPrivateKey()
            if (privateKey) {
                privateKeyRef.current = privateKey
                setE2eEnabled(true)
                console.log('E2E encryption enabled')
            } else {
                console.log('E2E encryption not available (no private key)')
            }
        }
        
        loadPrivateKey()
    }, [])

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

        socketRef.current.on('receive_message', async (data) => {
            try {
                if (data.encrypted && privateKeyRef.current) {
                    const encryptedPayload: EncryptedPayload = JSON.parse(data.message)
                    
                    const decryptedMessage = await decryptMessage(
                        encryptedPayload, 
                        privateKeyRef.current
                    )
                    
                    setMessages(prev => [...prev, {
                        ...data,
                        message: decryptedMessage,
                        wasEncrypted: true 
                    }])
                    
                } else {
                    setMessages(prev => [...prev, data])
                }
                
            } catch (error) {
                console.error('Failed to decrypt message:', error)
                setMessages(prev => [...prev, {
                    ...data,
                    message: '[Encrypted message - unable to decrypt]',
                    decryptFailed: true
                }])
            }
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

        socketRef.current.on('peer_connected', (data: { peer_id: string }) => {
            console.log('New peer connected:', data.peer_id)
            setP2pEvents(prev => [...prev, {
                type: 'peer_connected',
                peer_id: data.peer_id,
                timestamp: new Date().toISOString()
            }])
            socketRef.current?.emit('get_p2p_info')
        })

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

    const clearP2PEvents = useCallback(() => {
        setP2pEvents([])
    }, [])

    const clearConnectionHistory = useCallback(() => {
        setConnectionHistory([])
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

        p2pEvents,
        connectionHistory,
        clearP2PEvents,
        clearConnectionHistory,

        e2eEnabled,
        sendEncryptedMessage,
    }
}