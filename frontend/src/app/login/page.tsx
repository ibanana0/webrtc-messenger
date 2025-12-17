'use client'

import * as React from "react"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/glass/button'
import { Input } from '@/components/ui/glass/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/glass/card"
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import Link from 'next/link'
import DecryptedText from '../../components/ui/react-bits/DecryptedText';
import LiquidEther from "@/components/ui/react-bits/LiquidEther"
import { PageTransition } from "@/components/ui/page-transition"
import { setupE2EEncryption } from '@/lib/e2eSetup'

export default function LoginPage() {
    const router = useRouter()
    const login = useAuthStore((state) => state.login)

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [e2eStatus, setE2eStatus] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setE2eStatus('')
        setLoading(true)

        const { data, error: apiError } = await authApi.login(
            username,
            password,
        )

        if (apiError) {
            setError(apiError)
            setLoading(false)
            return
        }

        if (data) {
            // Login berhasil, simpan ke store
            login(data.user, data.token)

            // Setup E2E encryption (generate/load keys)
            setE2eStatus('Setting up encryption...')
            const e2eResult = await setupE2EEncryption()

            if (e2eResult.success) {
                if (e2eResult.isNewSetup) {
                    console.log('🔐 New E2E keys generated')
                } else {
                    console.log('🔐 Using existing E2E keys')
                }
            } else {
                console.warn('⚠️ E2E setup failed:', e2eResult.error)
                // Tetap lanjut ke chat, E2E opsional
            }

            router.push('/chat')
        }

        setLoading(false)
    }

    return (
        <PageTransition className="">
            <div className="relative min-h-screen overflow-hidden">
                <div className="fixed inset-0 w-screen h-screen">
                    <LiquidEther
                        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
                    />
                </div>
                <div className="relative z-10 flex min-h-screen items-center justify-center">
                    <Card className='shadow-glass border w-full max-w-md p-4 backdrop-blur-3xl'>
                        <CardHeader>
                            <CardTitle className='text-center text-2xl mb-4'>
                                <DecryptedText
                                    text="Welcome Back"
                                    speed={100}
                                    maxIterations={1}
                                    sequential={true}
                                    animateOn="view"
                                    revealDirection="start"
                                    loop={true}
                                    loopDelay={5000}
                                />
                            </CardTitle>
                            <CardDescription className="">Fill out your the credentials to sign in</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className=' flex flex-col justify-between h-fit space-y-4' onSubmit={handleSubmit}>
                                <Input placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <Input placeholder="Password"
                                    type='password'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                {e2eStatus && <p className="text-blue-300 text-sm text-center">🔐 {e2eStatus}</p>}

                                <Button type="submit" className="w-full cursor-pointer" disabled={loading} variant={'ghost'}>
                                    {loading ? (e2eStatus || 'Signing in...') : 'Sign In'}
                                </Button>
                            </form>
                            <p className="text-center mt-2 text-sm">
                                Belum punya akun?{' '}
                                <Link href="/register" className="text-blue-200 hover:underline">
                                    Register
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    )
}