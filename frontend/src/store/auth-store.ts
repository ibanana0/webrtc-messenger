import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: number
    username: string
    email: string
    public_key?: string
}

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    _hasHydrated: boolean
    login: (user: User, token: string) => void
    logout: () => void
    setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            _hasHydrated: false,
            login: (user, token) => set({
                user, token, isAuthenticated: true
            }),
            logout: () => set({
                user: null, token: null, isAuthenticated: false
            }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'auth-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            }
        }
    )
)