export interface EncryptedPayload {
    encryptedKey: string
    encryptedMessage: string
    iv: string
    version: number
}

export interface StorableKeyPair {
    publicKey: string
    privateKey: string
}

const ENCRYPTION_VERSION = 1
const RSA_CONFIG = {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
}

const AES_CONFIG = {
    name: 'AES-GCM',
    length: 256
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            RSA_CONFIG,
            true,
            ['encrypt', 'decrypt']
        )

        return keyPair
    } catch (error) {
        console.error('Failed to generate key pair:', error)
        throw new Error('Failed to generate encryption keys')
    }
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    try {
        const exported = await window.crypto.subtle.exportKey('spki', publicKey)
        const base64 = arrayBufferToBase64(exported)

        const pemBody = base64.match(/.{1,64}/g)?.join('\n') || base64

        return `-----BEGIN PUBLIC KEY-----\n${pemBody}\n-----END PUBLIC KEY-----`
    } catch (error) {
        console.error('Failed to export public key:', error)
        throw new Error('Failed to export public key')
    }
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    try {
        const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey)
        const base64 = arrayBufferToBase64(exported)

        const pemBody = base64.match(/.{1,64}/g)?.join('\n') || base64

        return `-----BEGIN PRIVATE KEY-----\n${pemBody}\n-----END PRIVATE KEY-----`
    } catch (error) {
        console.error('Failed to export private key:', error)
        throw new Error('Failed to export private key')
    }
}

export async function importPublicKey(pemPublicKey: string): Promise<CryptoKey> {
    try {
        // Remove PEM headers and whitespace
        const pemContents = pemPublicKey
            .replace('-----BEGIN PUBLIC KEY-----', '')
            .replace('-----END PUBLIC KEY-----', '')
            .replace(/\s/g, '')

        const binaryDer = base64ToArrayBuffer(pemContents)

        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            binaryDer,
            RSA_CONFIG,
            true,
            ['encrypt']
        )

        return publicKey
    } catch (error) {
        console.error('Failed to import public key:', error)
        throw new Error('Invalid public key format')
    }
}

export async function importPrivateKey(pemPrivateKey: string): Promise<CryptoKey> {
    try {
        const pemContents = pemPrivateKey
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s/g, '')

        const binaryDer = base64ToArrayBuffer(pemContents)

        const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            binaryDer,
            RSA_CONFIG,
            true,
            ['decrypt']
        )

        return privateKey
    } catch (error) {
        console.error('Failed to import private key:', error)
        throw new Error('Invalid private key format')
    }
}

export async function encryptMessage(
    message: string,
    recipientPublicKey: CryptoKey | string
): Promise<EncryptedPayload> {
    try {
        const publicKey = typeof recipientPublicKey === 'string'
            ? await importPublicKey(recipientPublicKey)
            : recipientPublicKey

        const aesKey = await window.crypto.subtle.generateKey(
            AES_CONFIG,
            true,
            ['encrypt', 'decrypt']
        )

        const iv = window.crypto.getRandomValues(new Uint8Array(12))

        const encoder = new TextEncoder()
        const messageBuffer = encoder.encode(message)

        const encryptedMessage = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            aesKey,
            messageBuffer
        )

        const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey)

        const encryptedKey = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            rawAesKey
        )

        return {
            encryptedKey: arrayBufferToBase64(encryptedKey),
            encryptedMessage: arrayBufferToBase64(encryptedMessage),
            iv: arrayBufferToBase64(iv),
            version: ENCRYPTION_VERSION
        }

    } catch (error) {
        console.error('Encryption failed:', error)
        throw new Error('Failed to encrypt message')
    }
}

export async function decryptMessage(
    payload: EncryptedPayload,
    privateKey: CryptoKey | string
): Promise<string> {
    try {
        if (payload.version !== ENCRYPTION_VERSION) {
            console.warn('Different encryption version:', payload.version)
        }

        const privKey = typeof privateKey === 'string'
            ? await importPrivateKey(privateKey)
            : privateKey

        const encryptedKeyBuffer = base64ToArrayBuffer(payload.encryptedKey)

        const rawAesKey = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privKey,
            encryptedKeyBuffer
        )

        const aesKey = await window.crypto.subtle.importKey(
            'raw',
            rawAesKey,
            AES_CONFIG,
            false,
            ['decrypt']
        )

        const encryptedMessageBuffer = base64ToArrayBuffer(payload.encryptedMessage)
        const iv = base64ToArrayBuffer(payload.iv)

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            aesKey,
            encryptedMessageBuffer
        )

        const decoder = new TextDecoder()
        return decoder.decode(decryptedBuffer)

    } catch (error) {
        console.error('Decryption failed:', error)
        throw new Error('Failed to decrypt message. Key mismatch or corrupted data.')
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
}

export async function generateAndExportKeyPair(): Promise<StorableKeyPair> {
    const keyPair = await generateKeyPair()

    const [publicKey, privateKey] = await Promise.all([
        exportPublicKey(keyPair.publicKey),
        exportPrivateKey(keyPair.privateKey)
    ])

    return { publicKey, privateKey }
}

export function isCryptoSupported(): boolean {
    return !!(
        window.crypto &&
        window.crypto.subtle &&
        window.crypto.getRandomValues
    )
}