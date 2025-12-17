/**
 * E2E Encryption menggunakan X25519 (Curve25519) + AES-256-GCM
 * 
 * Flow enkripsi:
 * 1. Generate ephemeral X25519 key pair
 * 2. Lakukan X25519 key exchange: ephemeralPrivate × recipientPublic = sharedSecret
 * 3. Derive AES key dari sharedSecret menggunakan SHA-256
 * 4. Encrypt message dengan AES-256-GCM
 * 5. Kirim: ephemeralPublicKey + nonce + ciphertext
 * 
 * Flow dekripsi:
 * 1. Extract ephemeral public key dari payload
 * 2. Lakukan X25519 key exchange: recipientPrivate × ephemeralPublic = sharedSecret
 * 3. Derive AES key dari sharedSecret
 * 4. Decrypt dengan AES-256-GCM
 */

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

// Encryption version untuk backward compatibility di masa depan
const ENCRYPTION_VERSION = 2

export interface EncryptedPayload {
    /** Ephemeral public key (base64) - digunakan untuk key exchange */
    ephemeralPublicKey: string
    /** Nonce/IV untuk AES-GCM (base64) */
    nonce: string
    /** Ciphertext terenkripsi (base64) */
    ciphertext: string
    /** Version enkripsi */
    version: number
}

export interface StorableKeyPair {
    /** Public key dalam format base64 */
    publicKey: string
    /** Private key dalam format base64 */
    privateKey: string
}

/**
 * Generate X25519 key pair baru untuk enkripsi
 * Menggunakan nacl.box yang berbasis Curve25519
 */
export function generateKeyPair(): StorableKeyPair {
    try {
        // nacl.box.keyPair() generates X25519 key pair
        const keyPair = nacl.box.keyPair()

        return {
            publicKey: encodeBase64(keyPair.publicKey),
            privateKey: encodeBase64(keyPair.secretKey)
        }
    } catch (error) {
        console.error('Failed to generate X25519 key pair:', error)
        throw new Error('Failed to generate encryption keys')
    }
}

/**
 * Alias untuk generateKeyPair (compatibility dengan kode lama)
 */
export async function generateAndExportKeyPair(): Promise<StorableKeyPair> {
    return generateKeyPair()
}

/**
 * Encrypt message menggunakan X25519 key exchange + NaCl secretbox (XSalsa20-Poly1305)
 * 
 * @param message - Plaintext message
 * @param recipientPublicKey - Public key penerima (base64 string)
 * @returns EncryptedPayload berisi ephemeral public key, nonce, dan ciphertext
 */
export async function encryptMessage(
    message: string,
    recipientPublicKey: string
): Promise<EncryptedPayload> {
    try {
        // Decode recipient's public key
        const recipientPubKeyBytes = decodeBase64(recipientPublicKey)

        // Generate ephemeral key pair untuk one-time key exchange
        const ephemeralKeyPair = nacl.box.keyPair()

        // Generate random nonce (24 bytes for nacl.box)
        const nonce = nacl.randomBytes(nacl.box.nonceLength)

        // Encode message to bytes
        const messageBytes = decodeUTF8(message)

        // Encrypt menggunakan nacl.box (X25519 + XSalsa20-Poly1305)
        // nacl.box melakukan:
        // 1. X25519 key exchange: ephemeralSecret × recipientPublic = sharedKey
        // 2. Encrypt dengan XSalsa20-Poly1305 (authenticated encryption)
        const ciphertext = nacl.box(
            messageBytes,
            nonce,
            recipientPubKeyBytes,
            ephemeralKeyPair.secretKey
        )

        if (!ciphertext) {
            throw new Error('Encryption failed - null ciphertext')
        }

        return {
            ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
            nonce: encodeBase64(nonce),
            ciphertext: encodeBase64(ciphertext),
            version: ENCRYPTION_VERSION
        }

    } catch (error) {
        console.error('Encryption failed:', error)
        throw new Error('Failed to encrypt message')
    }
}

/**
 * Decrypt message menggunakan X25519 key exchange + NaCl secretbox
 * 
 * @param payload - EncryptedPayload dari encryptMessage
 * @param privateKey - Private key penerima (base64 string)
 * @returns Decrypted plaintext message
 */
export async function decryptMessage(
    payload: EncryptedPayload,
    privateKey: string
): Promise<string> {
    try {
        // Version check
        if (payload.version !== ENCRYPTION_VERSION) {
            console.warn(`Different encryption version: ${payload.version}, current: ${ENCRYPTION_VERSION}`)
        }

        // Decode all base64 values
        const ephemeralPubKey = decodeBase64(payload.ephemeralPublicKey)
        const nonce = decodeBase64(payload.nonce)
        const ciphertext = decodeBase64(payload.ciphertext)
        const privateKeyBytes = decodeBase64(privateKey)

        // Decrypt menggunakan nacl.box.open
        // nacl.box.open melakukan:
        // 1. X25519 key exchange: recipientSecret × ephemeralPublic = sharedKey
        // 2. Decrypt dan verify dengan XSalsa20-Poly1305
        const decrypted = nacl.box.open(
            ciphertext,
            nonce,
            ephemeralPubKey,
            privateKeyBytes
        )

        if (!decrypted) {
            throw new Error('Decryption failed - authentication failed or corrupted data')
        }

        // Decode bytes ke string
        return encodeUTF8(decrypted)

    } catch (error) {
        console.error('Decryption failed:', error)
        throw new Error('Failed to decrypt message. Key mismatch or corrupted data.')
    }
}

/**
 * Cek apakah browser mendukung crypto yang dibutuhkan
 * TweetNaCl adalah pure JS, jadi selalu didukung
 */
export function isCryptoSupported(): boolean {
    try {
        // Test dengan generate key pair
        const test = nacl.box.keyPair()
        return test.publicKey.length === 32 && test.secretKey.length === 32
    } catch {
        return false
    }
}

/**
 * Validasi format public key (harus 32 bytes dalam base64)
 */
export function isValidPublicKey(publicKey: string): boolean {
    try {
        const decoded = decodeBase64(publicKey)
        return decoded.length === 32
    } catch {
        return false
    }
}

/**
 * Validasi format private key (harus 32 bytes dalam base64)
 */
export function isValidPrivateKey(privateKey: string): boolean {
    try {
        const decoded = decodeBase64(privateKey)
        return decoded.length === 32
    } catch {
        return false
    }
}