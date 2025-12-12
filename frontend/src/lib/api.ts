const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface ApiResponse<T> {
    data?: T
    error?: string
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
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
    })
}