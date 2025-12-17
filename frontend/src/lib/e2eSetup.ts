/**
 * E2E Setup Helper
 * 
 * Fungsi untuk setup End-to-End Encryption secara otomatis.
 * Digunakan setelah login berhasil untuk memastikan user memiliki key pair.
 */

import { generateKeyPair, isCryptoSupported, isValidPublicKey } from './crypto'
import { hasKeyPair, saveKeyPair, getPublicKey } from './keyStore'
import { keysApi } from './api'

export interface E2ESetupResult {
    success: boolean
    isNewSetup: boolean
    error?: string
}

/**
 * Setup E2E encryption untuk user yang baru login.
 * @returns E2ESetupResult
 */
export async function setupE2EEncryption(): Promise<E2ESetupResult> {
    try {
        if (!isCryptoSupported()) {
            console.warn('⚠️ Crypto library tidak tersedia')
            return {
                success: false,
                isNewSetup: false,
                error: 'Crypto tidak tersedia'
            }
        }

        const existingKeyPair = await hasKeyPair()

        if (existingKeyPair) {
            const localPublicKey = await getPublicKey()

            if (localPublicKey && isValidPublicKey(localPublicKey)) {
                await syncPublicKeyToServer(localPublicKey)
            }

            console.log('🔐 E2E already setup, using existing X25519 keys')
            return {
                success: true,
                isNewSetup: false
            }
        }

        console.log('🔑 Generating new X25519 key pair...')
        const keyPair = generateKeyPair()

        await saveKeyPair(keyPair.publicKey, keyPair.privateKey)
        console.log('💾 X25519 keys saved to IndexedDB')
        console.log('   Public key (32 bytes):', keyPair.publicKey.substring(0, 20) + '...')

        const uploadResult = await keysApi.updatePublicKey(keyPair.publicKey)

        if (uploadResult.error) {
            console.error('Failed to upload public key:', uploadResult.error)
            return {
                success: true,
                isNewSetup: true,
                error: 'Keys generated but failed to sync to server'
            }
        }

        console.log('✅ E2E encryption setup complete! (X25519 + XSalsa20-Poly1305)')
        return {
            success: true,
            isNewSetup: true
        }

    } catch (error) {
        console.error('E2E setup failed:', error)
        return {
            success: false,
            isNewSetup: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Sync public key ke server jika belum ada.
 */
async function syncPublicKeyToServer(publicKey: string): Promise<void> {
    try {
        const result = await keysApi.updatePublicKey(publicKey)
        if (result.error) {
            console.warn('Failed to sync public key to server:', result.error)
        } else {
            console.log('🔄 X25519 public key synced to server')
        }
    } catch (error) {
        console.warn('Error syncing public key:', error)
    }
}

/**
 * Check E2E readiness tanpa setup.
 */
export async function checkE2EStatus(): Promise<{
    supported: boolean
    hasKeys: boolean
}> {
    const supported = isCryptoSupported()
    const hasKeys = supported ? await hasKeyPair() : false

    return { supported, hasKeys }
}
