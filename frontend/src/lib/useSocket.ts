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
    isDM?: boolean,
    recipient?: string,
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

    // E2E Encryption
    const privateKeyRef = useRef<string | null>(null)
    const e2eEnabledRef = useRef(false)
    const [e2eStatus, setE2eStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading')

    // Load private key on mount or when username changes
    useEffect(() => {
        const loadPrivateKey = async () => {
            // Skip if username not ready yet
            if (!username) {
                console.log('⏳ Waiting for username before loading keys...')
                return
            }

            console.log(`🔍 Loading E2E encryption keys for ${username}...`)
            try {
                const privateKey = await getPrivateKey()
                if (privateKey) {
                    privateKeyRef.current = privateKey
                    e2eEnabledRef.current = true
                    setE2eStatus('enabled')
                    console.log('🔐 E2E encryption ENABLED - X25519 private key loaded')
                    console.log('   Key (base64):', privateKey.substring(0, 20) + '...')
                } else {
                    setE2eStatus('disabled')
                    console.warn('⚠️ E2E encryption DISABLED - No private key in IndexedDB')
                    console.warn('   Tip: Re-login to generate E2E keys')
                }
            } catch (error) {
                setE2eStatus('disabled')
                console.error('❌ Failed to load private key:', error)
            }
        }
        loadPrivateKey()
    }, [username])

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
            console.log('📨 Received broadcast message:', data)
            console.log('   - encrypted:', data.encrypted)
            console.log('   - hasPrivateKey:', !!privateKeyRef.current)

            try {
                // Try to decrypt if message is encrypted and we have private key
                if (data.encrypted && privateKeyRef.current) {
                    const encryptedPayload: EncryptedPayload = JSON.parse(data.message)
                    const decryptedMessage = await decryptMessage(
                        encryptedPayload,
                        privateKeyRef.current
                    )
                    setMessages(prev => [...prev, {
                        ...data,
                        message: decryptedMessage
                    }])
                } else {
                    setMessages(prev => [...prev, data])
                }
            } catch (error) {
                // If decryption fails, show encrypted message indicator
                console.error('Failed to decrypt message:', error)
                setMessages(prev => [...prev, {
                    ...data,
                    message: '[Encrypted message - unable to decrypt]'
                }])
            }
        })

        // Handler for Direct Messages (E2E encrypted)
        socketRef.current.on('receive_direct_message', async (data) => {
            console.log('📩 Received DM:', data)
            console.log('   - from:', data.username)
            console.log('   - to:', data.recipient)
            console.log('   - current user:', username)
            console.log('   - encrypted:', data.encrypted)
            console.log('   - hasPrivateKey:', !!privateKeyRef.current)

            // Skip if this is our own message (we already added it locally)
            if (data.username === username) {
                console.log('   ⏭️ Skipping own message (already added locally)')
                return
            }

            console.log('   ✅ Processing message from:', data.username)

            try {
                // DMs are always encrypted with our public key
                if (data.encrypted && privateKeyRef.current) {
                    console.log('   🔐 Attempting to decrypt...')
                    console.log('   Payload preview:', data.message?.substring(0, 100))

                    const encryptedPayload: EncryptedPayload = JSON.parse(data.message)
                    console.log('   Parsed payload keys:', Object.keys(encryptedPayload))

                    const decryptedMessage = await decryptMessage(
                        encryptedPayload,
                        privateKeyRef.current
                    )
                    console.log('   🔓 Decrypted message:', decryptedMessage)

                    setMessages(prev => {
                        console.log('   📝 Adding decrypted message to state, current count:', prev.length)
                        return [...prev, {
                            ...data,
                            message: decryptedMessage,
                            isDM: true
                        }]
                    })
                    console.log('🔓 DM decrypted successfully!')
                } else {
                    console.log('   📝 Adding unencrypted DM to state')
                    // Unencrypted DM (fallback)
                    setMessages(prev => [...prev, {
                        ...data,
                        isDM: true
                    }])
                }
            } catch (error) {
                console.error('❌ Failed to decrypt DM:', error)
                console.log('   📝 Adding error message placeholder to state')
                setMessages(prev => [...prev, {
                    ...data,
                    message: '[Encrypted DM - unable to decrypt]',
                    isDM: true
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

    /**
     * Send broadcast message - NO encryption for broadcast (everyone can read)
     */
    const sendMessage = useCallback(async (message: string) => {
        if (!socketRef.current || !message.trim()) return

        // Broadcast messages are NOT encrypted (everyone in room can read)
        socketRef.current.emit('send_message', {
            username,
            message,
            encrypted: false,
            isDM: false,
            timestamp: new Date().toISOString()
        })
        console.log('📢 Broadcast message sent')
    }, [username])

    /**
     * Send Direct Message with E2E encryption
     * Encrypts the message with recipient's public key
     */
    const sendDirectMessage = useCallback(async (message: string, recipient: string) => {
        if (!socketRef.current || !message.trim() || !recipient) return

        const timestamp = new Date().toISOString()

        console.log('📤 sendDirectMessage called:')
        console.log('   - e2eEnabled:', e2eEnabledRef.current)
        console.log('   - hasPrivateKey:', !!privateKeyRef.current)
        console.log('   - recipient:', recipient)

        // For DM, we MUST encrypt with recipient's public key
        if (e2eEnabledRef.current && privateKeyRef.current) {
            try {
                // Get RECIPIENT's public key (not our own!)
                console.log(`   🔍 Fetching public key for ${recipient}...`)
                const { data, error } = await keysApi.getPublicKey(recipient)

                if (error) {
                    console.error(`   ❌ API Error getting public key:`, error)
                }

                if (data?.public_key) {
                    console.log(`   ✅ Got public key for ${recipient}`)
                    console.log(`   🔐 Encrypting message...`)

                    const encryptedPayload = await encryptMessage(message, data.public_key)

                    socketRef.current.emit('send_direct_message', {
                        username,
                        recipient,
                        message: JSON.stringify(encryptedPayload),
                        encrypted: true,
                        timestamp
                    })

                    // Add to local messages immediately (optimistic update)
                    // We can't decrypt our own sent message because it's encrypted for recipient
                    setMessages(prev => [...prev, {
                        username,
                        message, // Show original plaintext to sender
                        timestamp,
                        isDM: true,
                        recipient
                    }])

                    console.log(`   ✅ E2E encrypted DM sent to ${recipient}`)
                    console.log(`   📦 Payload preview:`, JSON.stringify(encryptedPayload).substring(0, 100) + '...')
                    return
                } else {
                    console.warn(`   ⚠️ No public key found for ${recipient}`)
                    console.warn('   Response data:', data)
                }
            } catch (error) {
                console.error('   ❌ DM encryption failed:', error)
            }
        } else {
            console.warn('   ⚠️ E2E not enabled or no private key')
        }

        // If E2E not available, send warning but still send (unencrypted DM)
        console.warn('⚠️ Falling back to UNENCRYPTED DM!')
        socketRef.current.emit('send_direct_message', {
            username,
            recipient,
            message,
            encrypted: false,
            timestamp
        })

        // Add to local messages for unencrypted DM too
        setMessages(prev => [...prev, {
            username,
            message,
            timestamp,
            isDM: true,
            recipient
        }])
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
        // Connection status
        isConnected,

        // Chat
        messages,
        onlineUsers,
        sendMessage,
        sendDirectMessage,

        // P2P Node Info
        nodeInfo,
        knownPeers,
        peerCount,

        // P2P Actions
        connectToPeer,
        refreshP2PInfo,

        // P2P Events & History
        p2pEvents,
        connectionHistory,
        clearP2PEvents,
        clearConnectionHistory,

        // E2E Status (for debugging)
        e2eStatus,
    }
}