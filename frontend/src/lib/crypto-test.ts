/**
 * E2E Encryption Test Utilities
 * 
 * File ini berisi fungsi-fungsi untuk testing dan debugging E2E encryption.
 * 
 * Cara penggunaan di Browser Console:
 * 1. Buka aplikasi di browser
 * 2. Buka Developer Tools (F12)
 * 3. Di Console, ketik:
 *    
 *    import('/src/lib/crypto-test.ts').then(m => m.runAllTests())
 * 
 * Atau test individual:
 *    import('/src/lib/crypto-test.ts').then(m => m.testKeyGeneration())
 */

import {
    generateKeyPair,
    generateAndExportKeyPair,
    exportPublicKey,
    exportPrivateKey,
    importPublicKey,
    importPrivateKey,
    encryptMessage,
    decryptMessage,
    isCryptoSupported,
    EncryptedPayload
} from './crypto'

import {
    saveKeyPair,
    getKeyPair,
    clearKeys,
    hasKeyPair
} from './keyStore'

// ============================================================================
// Console Styling
// ============================================================================

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

// ============================================================================
// Test Functions
// ============================================================================

/**
 * Test 1: Cek apakah Web Crypto API tersedia
 */
export async function testCryptoSupport(): Promise<boolean> {
    log('\n🔍 TEST 1: Crypto API Support', styles.subtitle)

    const supported = isCryptoSupported()

    if (supported) {
        log('✅ Web Crypto API is supported!', styles.success)
        log(`   window.crypto: ${!!window.crypto}`, styles.info)
        log(`   window.crypto.subtle: ${!!window.crypto.subtle}`, styles.info)
        log(`   window.crypto.getRandomValues: ${!!window.crypto.getRandomValues}`, styles.info)
    } else {
        log('❌ Web Crypto API is NOT supported!', styles.error)
        log('   Please use a modern browser (Chrome, Firefox, Safari, Edge)', styles.info)
    }

    return supported
}

/**
 * Test 2: Generate dan export key pair
 */
export async function testKeyGeneration(): Promise<{ publicKey: string, privateKey: string } | null> {
    log('\n🔑 TEST 2: Key Generation', styles.subtitle)

    try {
        log('Generating RSA-2048 key pair...', styles.info)
        const startTime = performance.now()

        const keys = await generateAndExportKeyPair()

        const endTime = performance.now()
        log(`✅ Key pair generated in ${(endTime - startTime).toFixed(2)}ms`, styles.success)

        log('\n📤 Public Key (first 150 chars):', styles.info)
        log(keys.publicKey.substring(0, 150) + '...', styles.data)

        log('\n🔐 Private Key (first 150 chars):', styles.info)
        log(keys.privateKey.substring(0, 150) + '...', styles.data)

        log(`\n   Public Key length: ${keys.publicKey.length} chars`, styles.info)
        log(`   Private Key length: ${keys.privateKey.length} chars`, styles.info)

        return keys
    } catch (error) {
        log(`❌ Key generation failed: ${error}`, styles.error)
        console.error(error)
        return null
    }
}

/**
 * Test 3: Encrypt dan decrypt message
 */
export async function testEncryption(customMessage?: string): Promise<boolean> {
    log('\n🔒 TEST 3: Encryption & Decryption', styles.subtitle)

    try {
        // Generate keys
        log('Step 1: Generating key pair...', styles.info)
        const keys = await generateAndExportKeyPair()

        // Original message
        const originalMessage = customMessage || "Hello! This is a test message for E2E encryption. 🔐🎉"
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

        log(`   encryptedKey length: ${encrypted.encryptedKey.length} chars`, styles.info)
        log(`   encryptedMessage length: ${encrypted.encryptedMessage.length} chars`, styles.info)
        log(`   iv length: ${encrypted.iv.length} chars`, styles.info)
        log(`   version: ${encrypted.version}`, styles.info)

        // Decrypt
        log('\nStep 4: Decrypting with private key...', styles.info)
        const startDecrypt = performance.now()
        const decrypted = await decryptMessage(encrypted, keys.privateKey)
        const endDecrypt = performance.now()

        log(`✅ Decrypted in ${(endDecrypt - startDecrypt).toFixed(2)}ms`, styles.success)
        log(`\nDecrypted message:`, styles.info)
        log(`"${decrypted}"`, styles.data)

        // Verify
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

/**
 * Test 4: Cross-user encryption simulation
 */
export async function testCrossUserEncryption(): Promise<boolean> {
    log('\n👥 TEST 4: Cross-User Encryption Simulation', styles.subtitle)

    try {
        // Alice generates her keys
        log('Step 1: Alice generates her key pair...', styles.info)
        const aliceKeys = await generateAndExportKeyPair()
        log('   Alice keys generated ✅', styles.success)

        // Bob generates his keys
        log('\nStep 2: Bob generates his key pair...', styles.info)
        const bobKeys = await generateAndExportKeyPair()
        log('   Bob keys generated ✅', styles.success)

        // Alice sends message to Bob (encrypts with Bob's public key)
        const aliceMessage = "Hey Bob! This is a secret message from Alice 🤫"
        log('\nStep 3: Alice encrypts message for Bob...', styles.info)
        log(`   Message: "${aliceMessage}"`, styles.data)

        const encryptedForBob = await encryptMessage(aliceMessage, bobKeys.publicKey)
        log('   Encrypted with Bob\'s public key ✅', styles.success)

        // Bob decrypts with his private key
        log('\nStep 4: Bob decrypts the message...', styles.info)
        const decryptedByBob = await decryptMessage(encryptedForBob, bobKeys.privateKey)
        log(`   Decrypted: "${decryptedByBob}"`, styles.data)

        // Bob replies to Alice
        const bobMessage = "Hi Alice! Got your message. Replying securely! 🔒"
        log('\nStep 5: Bob encrypts reply for Alice...', styles.info)
        log(`   Message: "${bobMessage}"`, styles.data)

        const encryptedForAlice = await encryptMessage(bobMessage, aliceKeys.publicKey)
        log('   Encrypted with Alice\'s public key ✅', styles.success)

        // Alice decrypts Bob's reply
        log('\nStep 6: Alice decrypts Bob\'s reply...', styles.info)
        const decryptedByAlice = await decryptMessage(encryptedForAlice, aliceKeys.privateKey)
        log(`   Decrypted: "${decryptedByAlice}"`, styles.data)

        // Verify both
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

/**
 * Test 5: Wrong key decryption (should fail)
 */
export async function testWrongKeyDecryption(): Promise<boolean> {
    log('\n🚫 TEST 5: Wrong Key Decryption (Security Test)', styles.subtitle)

    try {
        // Generate two different key pairs
        log('Step 1: Generating two different key pairs...', styles.info)
        const correctKeys = await generateAndExportKeyPair()
        const wrongKeys = await generateAndExportKeyPair()

        // Encrypt with correct public key
        const message = "This should only be readable with the correct private key"
        log(`\nStep 2: Encrypting message with Key Pair A...`, styles.info)
        const encrypted = await encryptMessage(message, correctKeys.publicKey)

        // Try to decrypt with wrong private key
        log('\nStep 3: Attempting to decrypt with Key Pair B (wrong key)...', styles.info)

        try {
            const wrongDecrypted = await decryptMessage(encrypted, wrongKeys.privateKey)
            // If we get here, the test failed (should have thrown error)
            log('❌ SECURITY ISSUE: Decryption succeeded with wrong key!', styles.error)
            log(`   Decrypted: "${wrongDecrypted}"`, styles.info)
            return false
        } catch (decryptError) {
            log('✅ Decryption correctly failed with wrong key!', styles.success)
            log(`   Error: ${decryptError}`, styles.info)
        }

        // Verify correct key still works
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

/**
 * Test 6: IndexedDB Key Storage
 */
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
        log('\nStep 2: Generating and saving new key pair...', styles.info)
        const keys = await generateAndExportKeyPair()
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

        // Verify keys match
        const publicMatch = keys.publicKey === retrieved.publicKey
        const privateMatch = keys.privateKey === retrieved.privateKey

        log('\nStep 4: Verifying keys match...', styles.info)
        log(`   Public key match: ${publicMatch ? '✅' : '❌'}`, publicMatch ? styles.success : styles.error)
        log(`   Private key match: ${privateMatch ? '✅' : '❌'}`, privateMatch ? styles.success : styles.error)

        // Test encryption with retrieved keys
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

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
    log('🧪 E2E ENCRYPTION TEST SUITE', styles.title)
    log('='.repeat(50), styles.info)
    log('Running all encryption tests...', styles.info)

    const results: { name: string, passed: boolean }[] = []

    // Test 1: Crypto Support
    results.push({
        name: 'Crypto API Support',
        passed: await testCryptoSupport()
    })

    // Test 2: Key Generation
    const keys = await testKeyGeneration()
    results.push({
        name: 'Key Generation',
        passed: keys !== null
    })

    // Test 3: Encryption/Decryption
    results.push({
        name: 'Encryption & Decryption',
        passed: await testEncryption()
    })

    // Test 4: Cross-User
    results.push({
        name: 'Cross-User Encryption',
        passed: await testCrossUserEncryption()
    })

    // Test 5: Security (Wrong Key)
    results.push({
        name: 'Security (Wrong Key Rejection)',
        passed: await testWrongKeyDecryption()
    })

    // Test 6: Key Storage
    results.push({
        name: 'IndexedDB Key Storage',
        passed: await testKeyStorage()
    })

    // Summary
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

// Export individual test for debugging
export {
    generateAndExportKeyPair,
    encryptMessage,
    decryptMessage,
    saveKeyPair,
    getKeyPair,
    clearKeys
}
