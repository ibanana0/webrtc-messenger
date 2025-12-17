const DB_NAME = 'p2p-messenger-keys'
const DB_VERSION = 1
const STORE_NAME = 'keys'

// Key identifiers
const PRIVATE_KEY_ID = 'user-private-key'
const PUBLIC_KEY_ID = 'user-public-key'

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        
        request.onerror = () => {
            console.error('Failed to open IndexedDB:', request.error)
            reject(new Error('Failed to open key storage'))
        }
        
        request.onsuccess = () => {
            resolve(request.result)
        }
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            
            // Create object store jika belum ada
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
                console.log('Key store created')
            }
        }
    })
}

export async function savePrivateKey(privateKey: string): Promise<void> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        
        const request = store.put({
            id: PRIVATE_KEY_ID,
            key: privateKey,
            createdAt: new Date().toISOString()
        })
        
        request.onsuccess = () => {
            console.log('Private key saved to IndexedDB')
            resolve()
        }
        
        request.onerror = () => {
            console.error('Failed to save private key:', request.error)
            reject(new Error('Failed to save private key'))
        }
    })
}

export async function savePublicKey(publicKey: string): Promise<void> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        
        const request = store.put({
            id: PUBLIC_KEY_ID,
            key: publicKey,
            createdAt: new Date().toISOString()
        })
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error('Failed to save public key'))
    })
}

export async function getPrivateKey(): Promise<string | null> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        
        const request = store.get(PRIVATE_KEY_ID)
        
        request.onsuccess = () => {
            const result = request.result
            resolve(result ? result.key : null)
        }
        
        request.onerror = () => {
            console.error('Failed to get private key:', request.error)
            reject(new Error('Failed to retrieve private key'))
        }
    })
}

export async function getPublicKey(): Promise<string | null> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        
        const request = store.get(PUBLIC_KEY_ID)
        
        request.onsuccess = () => {
            const result = request.result
            resolve(result ? result.key : null)
        }
        
        request.onerror = () => reject(new Error('Failed to retrieve public key'))
    })
}

export async function getKeyPair(): Promise<{publicKey: string, privateKey: string} | null> {
    const [publicKey, privateKey] = await Promise.all([
        getPublicKey(),
        getPrivateKey()
    ])
    
    if (publicKey && privateKey) {
        return { publicKey, privateKey }
    }
    
    return null
}

export async function saveKeyPair(publicKey: string, privateKey: string): Promise<void> {
    await Promise.all([
        savePublicKey(publicKey),
        savePrivateKey(privateKey)
    ])
}

export async function clearKeys(): Promise<void> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        
        const request = store.clear()
        
        request.onsuccess = () => {
            console.log('All keys cleared from IndexedDB')
            resolve()
        }
        
        request.onerror = () => reject(new Error('Failed to clear keys'))
    })
}

export async function hasKeyPair(): Promise<boolean> {
    const keyPair = await getKeyPair()
    return keyPair !== null
}

const recipientKeyCache = new Map<string, string>()

export function cacheRecipientKey(username: string, publicKey: string): void {
    recipientKeyCache.set(username.toLowerCase(), publicKey)
}

export function getCachedRecipientKey(username: string): string | undefined {
    return recipientKeyCache.get(username.toLowerCase())
}

export function clearRecipientKeyCache(): void {
    recipientKeyCache.clear()
}