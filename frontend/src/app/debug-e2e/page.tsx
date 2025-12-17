'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { getPrivateKey, getPublicKey, hasKeyPair, clearKeys, saveKeyPair } from '@/lib/keyStore'
import { generateAndExportKeyPair, isCryptoSupported } from '@/lib/crypto'
import { keysApi } from '@/lib/api'
import { Button } from '@/components/ui/glass/button'
import { Card } from '@/components/ui/glass/card'

export default function DebugE2EPage() {
    const user = useAuthStore(state => state.user)
    const [status, setStatus] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [testUsername, setTestUsername] = useState('')
    const [testResult, setTestResult] = useState<any>(null)

    const checkStatus = async () => {
        setLoading(true)
        try {
            const cryptoSupported = isCryptoSupported()
            const hasKeys = await hasKeyPair()
            const privateKey = await getPrivateKey()
            const publicKey = await getPublicKey()

            // Check server for current user's public key
            let serverKey = null
            if (user?.username) {
                const { data, error } = await keysApi.getPublicKey(user.username)
                serverKey = { data, error }
            }

            setStatus({
                cryptoSupported,
                hasKeys,
                hasPrivateKey: !!privateKey,
                hasPublicKey: !!publicKey,
                privateKeyPreview: privateKey ? privateKey.substring(0, 60) + '...' : null,
                publicKeyPreview: publicKey ? publicKey.substring(0, 60) + '...' : null,
                serverKey,
                username: user?.username
            })
        } catch (error) {
            setStatus({ error: String(error) })
        }
        setLoading(false)
    }

    useEffect(() => {
        checkStatus()
    }, [user])

    const handleGenerateKeys = async () => {
        try {
            setLoading(true)
            const keyPair = await generateAndExportKeyPair()
            await saveKeyPair(keyPair.publicKey, keyPair.privateKey)

            // Upload to server
            const { error } = await keysApi.updatePublicKey(keyPair.publicKey)
            if (error) {
                alert('Keys generated but failed to upload: ' + error)
            } else {
                alert('Keys generated and uploaded successfully!')
            }

            await checkStatus()
        } catch (error) {
            alert('Error: ' + String(error))
            setLoading(false)
        }
    }

    const handleClearKeys = async () => {
        if (confirm('Are you sure? This will remove your E2E keys!')) {
            await clearKeys()
            await checkStatus()
        }
    }

    const handleResync = async () => {
        try {
            setLoading(true)
            const { data, error } = await keysApi.resyncKey()
            if (error) {
                alert('Resync failed: ' + error)
            } else {
                alert(`✅ Key re-broadcasted for ${data?.username}! Other nodes should now have your public key.`)
            }
        } catch (error) {
            alert('Error: ' + String(error))
        }
        setLoading(false)
    }

    const handleTestRecipientKey = async () => {
        if (!testUsername.trim()) return

        try {
            const { data, error } = await keysApi.getPublicKey(testUsername.trim())
            setTestResult({
                username: testUsername,
                success: !!data?.public_key,
                data,
                error
            })
        } catch (error) {
            setTestResult({
                username: testUsername,
                success: false,
                error: String(error)
            })
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4">🔐 E2E Encryption Debug</h1>

            <Card className="p-4 mb-4">
                <h2 className="text-lg font-semibold mb-2">Current User: {user?.username || 'Not logged in'}</h2>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="space-y-2 text-sm font-mono">
                        <StatusRow label="Crypto API Supported" value={status.cryptoSupported} />
                        <StatusRow label="Has Key Pair (IndexedDB)" value={status.hasKeys} />
                        <StatusRow label="Has Private Key" value={status.hasPrivateKey} />
                        <StatusRow label="Has Public Key (local)" value={status.hasPublicKey} />

                        {status.privateKeyPreview && (
                            <div className="mt-2 p-2 bg-gray-800 rounded text-xs break-all">
                                <strong>Private Key:</strong><br />
                                {status.privateKeyPreview}
                            </div>
                        )}

                        {status.publicKeyPreview && (
                            <div className="mt-2 p-2 bg-gray-800 rounded text-xs break-all">
                                <strong>Public Key:</strong><br />
                                {status.publicKeyPreview}
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <h3 className="font-semibold mb-2">Server Status:</h3>
                            {status.serverKey?.error ? (
                                <p className="text-red-400">❌ Error: {status.serverKey.error}</p>
                            ) : status.serverKey?.data?.public_key ? (
                                <p className="text-green-400">✅ Public key exists on server</p>
                            ) : (
                                <p className="text-yellow-400">⚠️ No public key on server</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                    <Button onClick={checkStatus}>🔄 Refresh</Button>
                    <Button onClick={handleGenerateKeys} className="bg-green-600 hover:bg-green-700">
                        🔑 Generate New Keys
                    </Button>
                    <Button onClick={handleResync} className="bg-purple-600 hover:bg-purple-700">
                        📡 Resync to P2P
                    </Button>
                    <Button onClick={handleClearKeys} className="bg-red-600 hover:bg-red-700">
                        🗑️ Clear Keys
                    </Button>
                </div>
            </Card>

            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-2">Test Recipient's Public Key</h2>
                <p className="text-sm text-gray-400 mb-2">
                    Check if a user has their public key on the server (required for sending encrypted DMs)
                </p>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={testUsername}
                        onChange={(e) => setTestUsername(e.target.value)}
                        placeholder="Enter username..."
                        className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-600"
                    />
                    <Button onClick={handleTestRecipientKey}>
                        Test
                    </Button>
                </div>

                {testResult && (
                    <div className={`p-3 rounded ${testResult.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                        <p className="font-semibold">
                            {testResult.success ? '✅' : '❌'} {testResult.username}
                        </p>
                        {testResult.error && <p className="text-red-400 text-sm">{testResult.error}</p>}
                        {testResult.data?.public_key && (
                            <p className="text-green-400 text-sm mt-1">Has public key!</p>
                        )}
                    </div>
                )}
            </Card>

            <Card className="p-4 mt-4">
                <h2 className="text-lg font-semibold mb-2">📋 Troubleshooting</h2>
                <div className="text-sm space-y-2 text-gray-300">
                    <p><strong>Problem:</strong> encrypted = false in console</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Make sure you select a <strong>recipient</strong> (not "Everyone")</li>
                        <li>Check if YOUR private key exists above</li>
                        <li>Check if RECIPIENT's public key exists (test above)</li>
                        <li>Try "Generate New Keys" if you don't have keys</li>
                        <li>Ask recipient to re-login to generate their keys</li>
                    </ul>
                </div>
            </Card>
        </div>
    )
}

function StatusRow({ label, value }: { label: string, value: any }) {
    const isOk = value === true
    return (
        <div className="flex justify-between items-center py-1 border-b border-gray-700">
            <span>{label}</span>
            <span className={isOk ? 'text-green-400' : 'text-red-400'}>
                {isOk ? '✅ Yes' : '❌ No'}
            </span>
        </div>
    )
}
