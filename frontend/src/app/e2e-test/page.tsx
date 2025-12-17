'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import {
    generateAndExportKeyPair,
    encryptMessage,
    decryptMessage,
    isCryptoSupported
} from '@/lib/crypto'
import {
    saveKeyPair,
    getKeyPair,
    clearKeys,
    hasKeyPair
} from '@/lib/keyStore'
import { keysApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass/card'
import { Button } from '@/components/ui/glass/button'

interface TestResult {
    name: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    message?: string
    duration?: number
}

export default function E2ETestPage() {
    const router = useRouter()
    const user = useAuthStore(state => state.user)
    const hasHydrated = useAuthStore(state => state._hasHydrated)

    const [testResults, setTestResults] = useState<TestResult[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [localKeys, setLocalKeys] = useState<{ publicKey: string, privateKey: string } | null>(null)
    const [e2eStatus, setE2eStatus] = useState<'checking' | 'not_setup' | 'ready'>('checking')

    // Test message state
    const [testMessage, setTestMessage] = useState('Hello, this is a test message! 🔐')
    const [encryptedPayload, setEncryptedPayload] = useState<string | null>(null)
    const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null)

    useEffect(() => {
        if (hasHydrated && !user) {
            router.push('/login')
        }
    }, [user, router, hasHydrated])

    useEffect(() => {
        checkE2EStatus()
    }, [])

    const checkE2EStatus = async () => {
        try {
            const keys = await getKeyPair()
            if (keys) {
                setLocalKeys(keys)
                setE2eStatus('ready')
            } else {
                setE2eStatus('not_setup')
            }
        } catch (error) {
            console.error('Error checking E2E status:', error)
            setE2eStatus('not_setup')
        }
    }

    const updateTestResult = (index: number, update: Partial<TestResult>) => {
        setTestResults(prev => {
            const newResults = [...prev]
            newResults[index] = { ...newResults[index], ...update }
            return newResults
        })
    }

    const runAllTests = async () => {
        setIsRunning(true)
        setTestResults([
            { name: 'Crypto API Support', status: 'pending' },
            { name: 'Key Generation', status: 'pending' },
            { name: 'Encryption', status: 'pending' },
            { name: 'Decryption', status: 'pending' },
            { name: 'Key Storage (IndexedDB)', status: 'pending' },
            { name: 'Backend API (Save Key)', status: 'pending' },
        ])

        try {
            // Test 1: Crypto Support
            updateTestResult(0, { status: 'running' })
            const startT1 = performance.now()
            const cryptoSupported = isCryptoSupported()
            updateTestResult(0, {
                status: cryptoSupported ? 'passed' : 'failed',
                message: cryptoSupported ? 'Web Crypto API is available' : 'Web Crypto API not supported',
                duration: performance.now() - startT1
            })

            if (!cryptoSupported) {
                setIsRunning(false)
                return
            }

            // Test 2: Key Generation
            updateTestResult(1, { status: 'running' })
            const startT2 = performance.now()
            const keys = await generateAndExportKeyPair()
            updateTestResult(1, {
                status: keys ? 'passed' : 'failed',
                message: keys ? `Generated RSA-2048 key pair` : 'Failed to generate keys',
                duration: performance.now() - startT2
            })

            if (!keys) {
                setIsRunning(false)
                return
            }

            // Test 3: Encryption
            updateTestResult(2, { status: 'running' })
            const startT3 = performance.now()
            const testMsg = 'Test encryption message 🔐'
            const encrypted = await encryptMessage(testMsg, keys.publicKey)
            const encryptSuccess = encrypted && encrypted.encryptedMessage && encrypted.iv
            updateTestResult(2, {
                status: encryptSuccess ? 'passed' : 'failed',
                message: encryptSuccess
                    ? `Payload: ${encrypted.encryptedMessage.length} chars`
                    : 'Encryption failed',
                duration: performance.now() - startT3
            })

            // Test 4: Decryption
            updateTestResult(3, { status: 'running' })
            const startT4 = performance.now()
            const decrypted = await decryptMessage(encrypted, keys.privateKey)
            const decryptSuccess = decrypted === testMsg
            updateTestResult(3, {
                status: decryptSuccess ? 'passed' : 'failed',
                message: decryptSuccess
                    ? `Decrypted: "${decrypted}"`
                    : `Mismatch: "${decrypted}" vs "${testMsg}"`,
                duration: performance.now() - startT4
            })

            // Test 5: Key Storage
            updateTestResult(4, { status: 'running' })
            const startT5 = performance.now()
            await saveKeyPair(keys.publicKey, keys.privateKey)
            const retrieved = await getKeyPair()
            const storageSuccess = retrieved?.publicKey === keys.publicKey
            updateTestResult(4, {
                status: storageSuccess ? 'passed' : 'failed',
                message: storageSuccess
                    ? 'Keys saved and retrieved successfully'
                    : 'Key storage/retrieval failed',
                duration: performance.now() - startT5
            })

            setLocalKeys(keys)
            setE2eStatus('ready')

            // Test 6: Backend API
            updateTestResult(5, { status: 'running' })
            const startT6 = performance.now()
            const { error } = await keysApi.updatePublicKey(keys.publicKey)
            updateTestResult(5, {
                status: error ? 'failed' : 'passed',
                message: error
                    ? `API Error: ${error}`
                    : 'Public key saved to server',
                duration: performance.now() - startT6
            })

        } catch (error) {
            console.error('Test error:', error)
        }

        setIsRunning(false)
    }

    const handleEncrypt = async () => {
        if (!localKeys || !testMessage) return

        try {
            const encrypted = await encryptMessage(testMessage, localKeys.publicKey)
            setEncryptedPayload(JSON.stringify(encrypted, null, 2))
            setDecryptedMessage(null)
        } catch (error) {
            console.error('Encryption error:', error)
            setEncryptedPayload(`Error: ${error}`)
        }
    }

    const handleDecrypt = async () => {
        if (!localKeys || !encryptedPayload) return

        try {
            const payload = JSON.parse(encryptedPayload)
            const decrypted = await decryptMessage(payload, localKeys.privateKey)
            setDecryptedMessage(decrypted)
        } catch (error) {
            console.error('Decryption error:', error)
            setDecryptedMessage(`Error: ${error}`)
        }
    }

    const handleClearKeys = async () => {
        await clearKeys()
        setLocalKeys(null)
        setE2eStatus('not_setup')
    }

    if (!user) return null

    const passedCount = testResults.filter(r => r.status === 'passed').length
    const failedCount = testResults.filter(r => r.status === 'failed').length

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">🔐 E2E Encryption Test</h1>
                        <p className="text-gray-400 mt-1">Debug and verify encryption functionality</p>
                    </div>
                    <Button onClick={() => router.push('/chat')} variant="outline">
                        ← Back to Chat
                    </Button>
                </div>

                {/* E2E Status */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {e2eStatus === 'checking' && '⏳'}
                            {e2eStatus === 'not_setup' && '⚠️'}
                            {e2eStatus === 'ready' && '✅'}
                            E2E Encryption Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                {e2eStatus === 'checking' && <p>Checking status...</p>}
                                {e2eStatus === 'not_setup' && (
                                    <p className="text-yellow-400">
                                        E2E encryption not set up. Run tests to generate keys.
                                    </p>
                                )}
                                {e2eStatus === 'ready' && (
                                    <div>
                                        <p className="text-green-400">E2E encryption is ready!</p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            Public key: {localKeys?.publicKey.substring(0, 60)}...
                                        </p>
                                    </div>
                                )}
                            </div>
                            {e2eStatus === 'ready' && (
                                <Button
                                    onClick={handleClearKeys}
                                    variant="destructive"
                                    size="sm"
                                >
                                    Clear Keys
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Test Runner */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>🧪 Test Suite</span>
                            <Button
                                onClick={runAllTests}
                                disabled={isRunning}
                            >
                                {isRunning ? '⏳ Running...' : '▶️ Run All Tests'}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {testResults.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">
                                Click "Run All Tests" to start the test suite
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {testResults.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border ${result.status === 'passed' ? 'border-green-500/30 bg-green-900/20' :
                                                result.status === 'failed' ? 'border-red-500/30 bg-red-900/20' :
                                                    result.status === 'running' ? 'border-blue-500/30 bg-blue-900/20' :
                                                        'border-gray-500/30 bg-gray-900/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {result.status === 'pending' && '⏳'}
                                                {result.status === 'running' && '🔄'}
                                                {result.status === 'passed' && '✅'}
                                                {result.status === 'failed' && '❌'}
                                                <span className="font-medium">{result.name}</span>
                                            </div>
                                            {result.duration && (
                                                <span className="text-gray-400 text-sm">
                                                    {result.duration.toFixed(2)}ms
                                                </span>
                                            )}
                                        </div>
                                        {result.message && (
                                            <p className="text-sm text-gray-400 mt-1 ml-6">
                                                {result.message}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {testResults.length > 0 && !isRunning && (
                                    <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                                        <span className={`text-lg font-bold ${failedCount === 0 ? 'text-green-400' : 'text-yellow-400'
                                            }`}>
                                            {passedCount}/{testResults.length} tests passed
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Manual Encryption Test */}
                {e2eStatus === 'ready' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>🔬 Manual Encryption Test</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Input */}
                            <div>
                                <label className="text-sm text-gray-400">Message to encrypt:</label>
                                <textarea
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    className="w-full mt-1 p-3 bg-black/30 border border-gray-700 rounded-lg text-white resize-none"
                                    rows={2}
                                />
                                <Button
                                    onClick={handleEncrypt}
                                    className="mt-2"
                                    disabled={!testMessage}
                                >
                                    🔒 Encrypt
                                </Button>
                            </div>

                            {/* Encrypted Output */}
                            {encryptedPayload && (
                                <div>
                                    <label className="text-sm text-gray-400">Encrypted payload:</label>
                                    <pre className="mt-1 p-3 bg-black/50 border border-gray-700 rounded-lg text-xs overflow-auto max-h-40 text-orange-300">
                                        {encryptedPayload}
                                    </pre>
                                    <Button
                                        onClick={handleDecrypt}
                                        className="mt-2"
                                    >
                                        🔓 Decrypt
                                    </Button>
                                </div>
                            )}

                            {/* Decrypted Output */}
                            {decryptedMessage && (
                                <div>
                                    <label className="text-sm text-gray-400">Decrypted message:</label>
                                    <div className="mt-1 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300">
                                        {decryptedMessage}
                                    </div>
                                    {decryptedMessage === testMessage && (
                                        <p className="text-green-400 text-sm mt-2">
                                            ✅ Messages match! Encryption working correctly.
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Console Instructions */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>💻 Console Commands</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-400 mb-3">
                            Open browser Developer Tools (F12) and run these commands in Console:
                        </p>
                        <pre className="p-4 bg-black/50 rounded-lg text-sm overflow-auto text-green-300">
                            {`// Run all tests
import('/src/lib/crypto-test.ts').then(m => m.runAllTests())

// Test individual functions
import('/src/lib/crypto-test.ts').then(m => m.testKeyGeneration())
import('/src/lib/crypto-test.ts').then(m => m.testEncryption())
import('/src/lib/crypto-test.ts').then(m => m.testCrossUserEncryption())
import('/src/lib/crypto-test.ts').then(m => m.testWrongKeyDecryption())
import('/src/lib/crypto-test.ts').then(m => m.testKeyStorage())`}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
