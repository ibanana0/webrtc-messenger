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

export default function RegisterPage() {
    const router = useRouter()
    const login = useAuthStore((state) => state.login)

    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { data, error: apiError } = await authApi.register(
            username,
            email,
            password,
        )

        if (apiError) {
            setError(apiError)
            setLoading(false)
            return
        }

        if (data) {
            router.push('/login')
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
                <div className="relative z-10 flex min-h-screen items-center justify-center ">
                    <Card className='shadow-glass border w-full max-w-md p-4 backdrop-blur-3xl'>
                        <CardHeader>
                            <CardTitle className='text-center text-2xl mb-4'>
                                <DecryptedText
                                    text="Register Your Account"
                                    speed={100}
                                    maxIterations={1}
                                    sequential={true}
                                    animateOn="view"
                                    revealDirection="start"
                                    loop={true}
                                    loopDelay={5000}
                                />
                            </CardTitle>
                            <CardDescription className="">
                                <span>Fill out your the credentials to create your Account</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className=' flex flex-col justify-between h-fit space-y-4' onSubmit={handleSubmit}>
                                <Input placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <Input placeholder="name@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <Input placeholder="Password"
                                    type='password'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                {error && <p className="text-red-500 text-sm">{error}</p>}

                                <Button type="submit" className="w-full cursor-pointer" disabled={loading} variant={'ghost'}>
                                    {loading ? 'Loading...' : 'Sign Up'}
                                </Button>
                            </form>
                            <p className="text-center mt-2 text-sm">
                                Sudah punya akun?{' '}
                                <Link href="/login" className="text-blue-200 hover:underline">
                                    Sign In
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    )
}