// Dynamic API URL - can be overridden via localStorage for multi-node testing
function getApiUrl(): string {
    if (typeof window !== 'undefined') {
        const customUrl = localStorage.getItem('backendUrl')
        if (customUrl) return customUrl
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
}

/**
 * Get auth token from Zustand persist storage.
 * Zustand stores state in localStorage under 'auth-storage' key as JSON.
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null

    try {
        const authStorage = localStorage.getItem('auth-storage')
        if (!authStorage) return null

        const parsed = JSON.parse(authStorage)
        return parsed?.state?.token || null
    } catch (error) {
        console.error('Failed to get auth token:', error)
        return null
    }
}

interface ApiResponse<T> {
    data?: T
    error?: string
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const API_URL = getApiUrl()
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        })

        const data = await response.json()

        if (!response.ok) {
            return { error: data.error || 'Something went wrong' }
        }

        return { data }
    } catch (error) {
        return { error: 'Network error' }
    }
}

export async function authApiRequest<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    return apiRequest<T>(endpoint, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        },
    })
}


export const authApi = {
    register: (username: string, email: string, password: string) => apiRequest<{
        user: any;
        token: string
    }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    }),

    login: (username: string, password: string) => apiRequest<{
        user: any,
        token: string
    }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    }),

    me: (token: string) =>
        authApiRequest<{ user: User }>('/api/auth/me', token),
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

interface P2PStatus {
    is_running: boolean
    peer_count: number
    node_info: NodeInfo
}

interface User {
    id: number
    username: string
    email: string
    public_key?: string
}

export const p2pApi = {
    getNodeInfo: () =>
        apiRequest<{ success: boolean; data: NodeInfo }>('/api/p2p/info'),

    connectToPeer: (address: string, token: string) =>
        authApiRequest<{ success: boolean; message: string }>(
            '/api/p2p/connect',
            token,
            {
                method: 'POST',
                body: JSON.stringify({ address }),
            }
        ),

    getPeers: (token: string) =>
        authApiRequest<{ success: boolean; data: PeerInfo[] }>(
            '/api/p2p/peers',
            token
        ),

    getStatus: () =>
        apiRequest<{ success: boolean; data: P2PStatus }>('/api/p2p/status'),

    sendMessage: (message: string, token: string) =>
        authApiRequest<{ success: boolean; message: string }>(
            '/api/p2p/send',
            token,
            {
                method: 'POST',
                body: JSON.stringify({
                    message,
                    timestamp: new Date().toISOString()
                }),
            }
        ),
}

export const keysApi = {
    getPublicKey: async (username: string): Promise<ApiResponse<{ username: string, public_key: string }>> => {
        const token = getAuthToken()

        const res = await fetch(`${getApiUrl()}/api/keys/user/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        const data = await res.json()

        if (!res.ok) {
            return { data: undefined, error: data.error || 'Failed to fetch public key' }
        }

        return { data, error: undefined }
    },

    updatePublicKey: async (publicKey: string): Promise<ApiResponse<{ message: string }>> => {
        const token = getAuthToken()

        const res = await fetch(`${getApiUrl()}/api/keys/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ public_key: publicKey })
        })

        const data = await res.json()

        if (!res.ok) {
            return { data: undefined, error: data.error || 'Failed to update public key' }
        }

        return { data, error: undefined }
    },

    getMultiplePublicKeys: async (usernames: string[]): Promise<ApiResponse<{ keys: Record<string, string | null> }>> => {
        const token = getAuthToken()

        const res = await fetch(`${getApiUrl()}/api/keys/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ usernames })
        })

        const data = await res.json()

        if (!res.ok) {
            return { data: undefined, error: data.error || 'Failed to fetch public keys' }
        }

        return { data, error: undefined }
    }
}