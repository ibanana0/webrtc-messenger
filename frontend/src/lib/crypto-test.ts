import {
    generateKeyPair,
    generateAndExportKeyPair,
    encryptMessage,
    decryptMessage,
    isCryptoSupported,
    isValidPublicKey,
    isValidPrivateKey,
    EncryptedPayload
} from './crypto'

import {
    saveKeyPair,
    getKeyPair,
    clearKeys,
    hasKeyPair
} from './keyStore'

const styles = {
    title: 'font-size: 16px; font-weight: bold; color: #4CAF50;',
    subtitle: 'font-size: 14px; font-weight: bold; color: #2196F3;',
    success: 'color: #4CAF50; font-weight: bold;',
    error: 'color: #f44336; font-weight: bold;',
    info: 'color: #9E9E9E;',
    data: 'color: #FF9800;'
}

function log(message: string, style: string = '') {
    console.log(`%c${message}`, style)
}

export async function testCryptoSupport(): Promise<boolean> {
    log('\n🔍 TEST 1: X25519 Crypto Support', styles.subtitle)

    const supported = isCryptoSupported()

    if (supported) {
        log('✅ TweetNaCl (X25519) is available!', styles.success)
        log('   Algorithm: X25519 + XSalsa20-Poly1305', styles.info)
        log('   Key size: 32 bytes (256 bits)', styles.info)
    } else {
        log('❌ TweetNaCl is NOT available!', styles.error)
    }

    return supported
}

export async function testKeyGeneration(): Promise<{ publicKey: string, privateKey: string } | null> {
    log('\n🔑 TEST 2: X25519 Key Generation', styles.subtitle)

    try {
        log('Generating X25519 key pair...', styles.info)
        const startTime = performance.now()

        const keys = generateKeyPair()

        const endTime = performance.now()
        log(`✅ Key pair generated in ${(endTime - startTime).toFixed(2)}ms`, styles.success)

        log('\n📤 Public Key (base64):', styles.info)
        log(keys.publicKey, styles.data)

        log('\n🔐 Private Key (base64):', styles.info)
        log(keys.privateKey, styles.data)

        log(`\n   Public Key length: ${keys.publicKey.length} chars (44 expected)`, styles.info)
        log(`   Private Key length: ${keys.privateKey.length} chars (44 expected)`, styles.info)

        // Validasi format
        const validPub = isValidPublicKey(keys.publicKey)
        const validPriv = isValidPrivateKey(keys.privateKey)
        log(`   Valid public key format: ${validPub ? '✅' : '❌'}`, validPub ? styles.success : styles.error)
        log(`   Valid private key format: ${validPriv ? '✅' : '❌'}`, validPriv ? styles.success : styles.error)

        return keys
    } catch (error) {
        log(`❌ Key generation failed: ${error}`, styles.error)
        console.error(error)
        return null
    }
}

export async function testEncryption(customMessage?: string): Promise<boolean> {
    log('\n🔒 TEST 3: X25519 Encryption & Decryption', styles.subtitle)

    try {
        // Generate keys
        log('Step 1: Generating X25519 key pair...', styles.info)
        const keys = generateKeyPair()

        // Original message
        const originalMessage = customMessage || "Hello! This is a test message for X25519 E2E encryption. 🔐🎉"
        log(`\nStep 2: Original message:`, styles.info)
        log(`"${originalMessage}"`, styles.data)

        // Encrypt
        log('\nStep 3: Encrypting with recipient public key...', styles.info)
        const startEncrypt = performance.now()
        const encrypted = await encryptMessage(originalMessage, keys.publicKey)
        const endEncrypt = performance.now()

        log(`✅ Encrypted in ${(endEncrypt - startEncrypt).toFixed(2)}ms`, styles.success)
        log('\nEncrypted payload:', styles.info)
        console.log(encrypted)

        log(`   ephemeralPublicKey length: ${encrypted.ephemeralPublicKey.length} chars`, styles.info)
        log(`   nonce length: ${encrypted.nonce.length} chars`, styles.info)
        log(`   ciphertext length: ${encrypted.ciphertext.length} chars`, styles.info)
        log(`   version: ${encrypted.version}`, styles.info)

        // Decrypt
        log('\nStep 4: Decrypting with private key...', styles.info)
        const startDecrypt = performance.now()
        const decrypted = await decryptMessage(encrypted, keys.privateKey)
        const endDecrypt = performance.now()

        log(`✅ Decrypted in ${(endDecrypt - startDecrypt).toFixed(2)}ms`, styles.success)
        log(`\nDecrypted message:`, styles.info)
        log(`"${decrypted}"`, styles.data)

        const isMatch = originalMessage === decrypted
        if (isMatch) {
            log('\n✅✅✅ ENCRYPTION TEST PASSED! Messages match perfectly.', styles.success)
        } else {
            log('\n❌❌❌ ENCRYPTION TEST FAILED! Messages do not match.', styles.error)
            log(`Original: "${originalMessage}"`, styles.info)
            log(`Decrypted: "${decrypted}"`, styles.info)
        }

        return isMatch
    } catch (error) {
        log(`❌ Encryption test failed: ${error}`, styles.error)
        console.error(error)
        return false
    }
}

export async function testCrossUserEncryption(): Promise<boolean> {
    log('\n👥 TEST 4: Cross-User X25519 Encryption', styles.subtitle)

    try {
        log('Step 1: Alice generates her X25519 key pair...', styles.info)
        const aliceKeys = generateKeyPair()
        log('   Alice keys generated ✅', styles.success)

        log('\nStep 2: Bob generates his X25519 key pair...', styles.info)
        const bobKeys = generateKeyPair()
        log('   Bob keys generated ✅', styles.success)

        const aliceMessage = "Hey Bob! This is a secret message from Alice 🤫"
        log('\nStep 3: Alice encrypts message for Bob...', styles.info)
        log(`   Message: "${aliceMessage}"`, styles.data)

        const encryptedForBob = await encryptMessage(aliceMessage, bobKeys.publicKey)
        log('   Encrypted with Bob\'s public key ✅', styles.success)

        log('\nStep 4: Bob decrypts the message...', styles.info)
        const decryptedByBob = await decryptMessage(encryptedForBob, bobKeys.privateKey)
        log(`   Decrypted: "${decryptedByBob}"`, styles.data)

        const bobMessage = "Hi Alice! Got your message. Replying securely! 🔒"
        log('\nStep 5: Bob encrypts reply for Alice...', styles.info)
        log(`   Message: "${bobMessage}"`, styles.data)

        const encryptedForAlice = await encryptMessage(bobMessage, aliceKeys.publicKey)
        log('   Encrypted with Alice\'s public key ✅', styles.success)

        log('\nStep 6: Alice decrypts Bob\'s reply...', styles.info)
        const decryptedByAlice = await decryptMessage(encryptedForAlice, aliceKeys.privateKey)
        log(`   Decrypted: "${decryptedByAlice}"`, styles.data)

        const aliceSuccess = aliceMessage === decryptedByBob
        const bobSuccess = bobMessage === decryptedByAlice

        if (aliceSuccess && bobSuccess) {
            log('\n✅✅✅ CROSS-USER ENCRYPTION TEST PASSED!', styles.success)
            log('   Alice → Bob communication: Working ✅', styles.success)
            log('   Bob → Alice communication: Working ✅', styles.success)
        } else {
            log('\n❌ CROSS-USER ENCRYPTION TEST FAILED!', styles.error)
            log(`   Alice → Bob: ${aliceSuccess ? '✅' : '❌'}`, styles.info)
            log(`   Bob → Alice: ${bobSuccess ? '✅' : '❌'}`, styles.info)
        }

        return aliceSuccess && bobSuccess
    } catch (error) {
        log(`❌ Cross-user encryption test failed: ${error}`, styles.error)
        console.error(error)
        return false
    }
}

export async function testWrongKeyDecryption(): Promise<boolean> {
    log('\n🚫 TEST 5: Wrong Key Decryption (Security Test)', styles.subtitle)

    try {
        log('Step 1: Generating two different X25519 key pairs...', styles.info)
        const correctKeys = generateKeyPair()
        const wrongKeys = generateKeyPair()

        const message = "This should only be readable with the correct private key"
        log(`\nStep 2: Encrypting message with Key Pair A...`, styles.info)
        const encrypted = await encryptMessage(message, correctKeys.publicKey)

        log('\nStep 3: Attempting to decrypt with Key Pair B (wrong key)...', styles.info)

        try {
            const wrongDecrypted = await decryptMessage(encrypted, wrongKeys.privateKey)
            log('❌ SECURITY ISSUE: Decryption succeeded with wrong key!', styles.error)
            log(`   Decrypted: "${wrongDecrypted}"`, styles.info)
            return false
        } catch (decryptError) {
            log('✅ Decryption correctly failed with wrong key!', styles.success)
            log(`   Error: ${decryptError}`, styles.info)
        }

        log('\nStep 4: Verifying correct key still works...', styles.info)
        const correctDecrypted = await decryptMessage(encrypted, correctKeys.privateKey)

        if (correctDecrypted === message) {
            log('✅✅✅ SECURITY TEST PASSED!', styles.success)
            log('   Wrong key: Correctly rejected ✅', styles.success)
            log('   Correct key: Works properly ✅', styles.success)
            return true
        } else {
            log('❌ Correct key decryption mismatch', styles.error)
            return false
        }

    } catch (error) {
        log(`❌ Security test failed: ${error}`, styles.error)
        console.error(error)
        return false
    }
}

export async function testKeyStorage(): Promise<boolean> {
    log('\n💾 TEST 6: IndexedDB Key Storage', styles.subtitle)

    try {
        // Clear existing keys first
        log('Step 1: Clearing existing keys...', styles.info)
        await clearKeys()

        // Check no keys exist
        let hasKeys = await hasKeyPair()
        log(`   Has keys after clear: ${hasKeys}`, styles.info)

        if (hasKeys) {
            log('❌ Keys should be cleared but still exist', styles.error)
            return false
        }

        // Generate and save new keys
        log('\nStep 2: Generating and saving new X25519 key pair...', styles.info)
        const keys = generateKeyPair()
        await saveKeyPair(keys.publicKey, keys.privateKey)
        log('   Keys saved to IndexedDB ✅', styles.success)

        // Retrieve keys
        log('\nStep 3: Retrieving keys from IndexedDB...', styles.info)
        const retrieved = await getKeyPair()

        if (!retrieved) {
            log('❌ Failed to retrieve keys', styles.error)
            return false
        }

        log('   Keys retrieved ✅', styles.success)

        const publicMatch = keys.publicKey === retrieved.publicKey
        const privateMatch = keys.privateKey === retrieved.privateKey

        log('\nStep 4: Verifying keys match...', styles.info)
        log(`   Public key match: ${publicMatch ? '✅' : '❌'}`, publicMatch ? styles.success : styles.error)
        log(`   Private key match: ${privateMatch ? '✅' : '❌'}`, privateMatch ? styles.success : styles.error)

        log('\nStep 5: Testing encryption with retrieved keys...', styles.info)
        const testMessage = "Testing with retrieved keys"
        const encrypted = await encryptMessage(testMessage, retrieved.publicKey)
        const decrypted = await decryptMessage(encrypted, retrieved.privateKey)

        const encryptionWorks = testMessage === decrypted
        log(`   Encryption with retrieved keys: ${encryptionWorks ? '✅' : '❌'}`,
            encryptionWorks ? styles.success : styles.error)

        if (publicMatch && privateMatch && encryptionWorks) {
            log('\n✅✅✅ KEY STORAGE TEST PASSED!', styles.success)
            return true
        } else {
            log('\n❌ KEY STORAGE TEST FAILED!', styles.error)
            return false
        }

    } catch (error) {
        log(`❌ Key storage test failed: ${error}`, styles.error)
        console.error(error)
        return false
    }
}

export async function runAllTests(): Promise<void> {
    log('🧪 X25519 E2E ENCRYPTION TEST SUITE', styles.title)
    log('='.repeat(50), styles.info)
    log('Algorithm: X25519 + XSalsa20-Poly1305 (NaCl Box)', styles.info)
    log('Running all encryption tests...', styles.info)

    const results: { name: string, passed: boolean }[] = []

    results.push({
        name: 'X25519 Crypto Support',
        passed: await testCryptoSupport()
    })

    const keys = await testKeyGeneration()
    results.push({
        name: 'X25519 Key Generation',
        passed: keys !== null
    })

    results.push({
        name: 'Encryption & Decryption',
        passed: await testEncryption()
    })

    results.push({
        name: 'Cross-User Encryption',
        passed: await testCrossUserEncryption()
    })

    results.push({
        name: 'Security (Wrong Key Rejection)',
        passed: await testWrongKeyDecryption()
    })

    results.push({
        name: 'IndexedDB Key Storage',
        passed: await testKeyStorage()
    })

    log('\n' + '='.repeat(50), styles.info)
    log('📊 TEST RESULTS SUMMARY', styles.title)
    log('='.repeat(50), styles.info)

    let passedCount = 0
    results.forEach((result, index) => {
        const icon = result.passed ? '✅' : '❌'
        const style = result.passed ? styles.success : styles.error
        log(`${icon} Test ${index + 1}: ${result.name}`, style)
        if (result.passed) passedCount++
    })

    log('\n' + '='.repeat(50), styles.info)
    const allPassed = passedCount === results.length
    if (allPassed) {
        log(`🎉 ALL TESTS PASSED! (${passedCount}/${results.length})`, styles.success)
    } else {
        log(`⚠️  ${passedCount}/${results.length} tests passed`, styles.error)
    }
    log('='.repeat(50), styles.info)
}

export async function decryptWebSocketMessage(encryptedPayloadString: string): Promise<string> {
    log('\n🔓 DECRYPT WEBSOCKET MESSAGE', styles.subtitle)

    try {
        const payload: EncryptedPayload = JSON.parse(encryptedPayloadString)
        log('Parsed X25519 payload:', styles.info)
        console.log(payload)

        log('\nRetrieving X25519 private key from IndexedDB...', styles.info)
        const keyPair = await getKeyPair()

        if (!keyPair) {
            log('❌ No private key found in IndexedDB!', styles.error)
            log('   Anda perlu login terlebih dahulu agar key tersedia.', styles.info)
            throw new Error('No private key found')
        }

        log('✅ Private key found', styles.success)

        // Decrypt
        log('\nDecrypting message...', styles.info)
        const decrypted = await decryptMessage(payload, keyPair.privateKey)

        log('✅ Decryption successful!', styles.success)
        log('\n📩 Decrypted message:', styles.info)
        log(`"${decrypted}"`, styles.data)

        return decrypted

    } catch (error) {
        log(`❌ Decryption failed: ${error}`, styles.error)
        throw error
    }
}

export async function encryptTestMessage(message: string): Promise<EncryptedPayload> {
    log('\n🔒 ENCRYPT TEST MESSAGE', styles.subtitle)

    try {
        // Get public key from IndexedDB
        const keyPair = await getKeyPair()

        if (!keyPair) {
            log('⚠️ No key pair in IndexedDB, generating new X25519 pair...', styles.info)
            const newKeys = generateKeyPair()
            await saveKeyPair(newKeys.publicKey, newKeys.privateKey)

            const encrypted = await encryptMessage(message, newKeys.publicKey)
            log('✅ Message encrypted with new X25519 key pair', styles.success)
            console.log(encrypted)
            return encrypted
        }

        const encrypted = await encryptMessage(message, keyPair.publicKey)
        log('✅ Message encrypted', styles.success)
        log('\n📦 Encrypted payload:', styles.info)
        console.log(encrypted)

        log('\n💡 Copy JSON ini untuk testing dekripsi:', styles.info)
        log(JSON.stringify(encrypted), styles.data)

        return encrypted

    } catch (error) {
        log(`❌ Encryption failed: ${error}`, styles.error)
        throw error
    }
}

export async function checkE2EStatus(): Promise<void> {
    log('\n🔍 X25519 E2E STATUS CHECK', styles.subtitle)

    const hasKeys = await hasKeyPair()

    if (hasKeys) {
        log('✅ X25519 E2E Encryption is READY', styles.success)
        const keys = await getKeyPair()
        if (keys) {
            log(`   Public key (base64): ${keys.publicKey}`, styles.info)
            log(`   Valid format: ${isValidPublicKey(keys.publicKey) ? '✅' : '❌'}`, styles.info)
        }
    } else {
        log('❌ E2E Encryption is NOT SETUP', styles.error)
        log('   Login ke aplikasi untuk generate X25519 key pair', styles.info)
    }
}

if (typeof window !== 'undefined') {
    (window as any).e2eTest = {
        runAllTests,
        testCryptoSupport,
        testKeyGeneration,
        testEncryption,
        testCrossUserEncryption,
        testWrongKeyDecryption,
        testKeyStorage,
        decryptWebSocketMessage,
        encryptTestMessage,
        checkE2EStatus,
        generateKeyPair,
        encryptMessage,
        decryptMessage,
        getKeyPair,
        clearKeys
    }

    console.log('%c🔐 X25519 E2E Test Utilities Loaded!', 'color: #4CAF50; font-weight: bold;')
    console.log('%cAlgorithm: X25519 + XSalsa20-Poly1305', 'color: #2196F3;')
    console.log('%cUse window.e2eTest.runAllTests() or other functions', 'color: #9E9E9E;')
}
