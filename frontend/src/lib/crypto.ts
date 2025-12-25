import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

const ENCRYPTION_VERSION = 2

export interface EncryptedPayload {
    ephemeralPublicKey: string
    nonce: string
    ciphertext: string
    version: number
}

export interface StorableKeyPair {
    publicKey: string
    privateKey: string
}

export function generateKeyPair(): StorableKeyPair {
    try {
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

export async function generateAndExportKeyPair(): Promise<StorableKeyPair> {
    return generateKeyPair()
}

export async function encryptMessage(
    message: string,
    recipientPublicKey: string
): Promise<EncryptedPayload> {
    try {
        const recipientPubKeyBytes = decodeBase64(recipientPublicKey)
        const ephemeralKeyPair = nacl.box.keyPair()
        const nonce = nacl.randomBytes(nacl.box.nonceLength)
        const messageBytes = decodeUTF8(message)

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

export async function decryptMessage(
    payload: EncryptedPayload,
    privateKey: string
): Promise<string> {
    try {
        if (payload.version !== ENCRYPTION_VERSION) {
            console.warn(`Different encryption version: ${payload.version}, current: ${ENCRYPTION_VERSION}`)
        }

        const ephemeralPubKey = decodeBase64(payload.ephemeralPublicKey)
        const nonce = decodeBase64(payload.nonce)
        const ciphertext = decodeBase64(payload.ciphertext)
        const privateKeyBytes = decodeBase64(privateKey)

        const decrypted = nacl.box.open(
            ciphertext,
            nonce,
            ephemeralPubKey,
            privateKeyBytes
        )

        if (!decrypted) {
            throw new Error('Decryption failed - authentication failed or corrupted data')
        }

        return encodeUTF8(decrypted)

    } catch (error) {
        console.error('Decryption failed:', error)
        throw new Error('Failed to decrypt message. Key mismatch or corrupted data.')
    }
}

export function isCryptoSupported(): boolean {
    try {
        const test = nacl.box.keyPair()
        return test.publicKey.length === 32 && test.secretKey.length === 32
    } catch {
        return false
    }
}

export function isValidPublicKey(publicKey: string): boolean {
    try {
        const decoded = decodeBase64(publicKey)
        return decoded.length === 32
    } catch {
        return false
    }
}

export function isValidPrivateKey(privateKey: string): boolean {
    try {
        const decoded = decodeBase64(privateKey)
        return decoded.length === 32
    } catch {
        return false
    }
}