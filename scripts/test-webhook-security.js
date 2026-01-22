const crypto = require('crypto');
const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const WEBHOOK_SECRET = process.env.HYPERPAY_WEBHOOK_SECRET || 'test-secret-key';

// Test data
const TEST_ORDER_ID = '507f1f77bcf86cd799439011'; // Replace with actual order ID
const TEST_CHECKOUT_ID = 'ABC123DEF456'; // Replace with actual checkout ID

/**
 * Generate HMAC-SHA256 signature for webhook
 */
function generateSignature(payload) {
    return crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
}

/**
 * Test 1: Valid webhook signature
 */
async function testValidSignature() {
    console.log('\n📝 Test 1: Valid Webhook Signature');
    console.log('='.repeat(50));

    const payload = {
        checkoutId: TEST_CHECKOUT_ID,
        result: {
            code: '000.000.000', // Success code
            description: 'Transaction successful'
        }
    };

    const signature = generateSignature(payload);

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Generated Signature:', signature);

    try {
        const response = await axios.post(
            `${BASE_URL}/api/payments/callback/${TEST_ORDER_ID}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-hyperpay-signature': signature
                }
            }
        );

        console.log('✅ SUCCESS:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ FAILED:', error.response?.status, error.response?.data?.message || error.message);
        return false;
    }
}

/**
 * Test 2: Invalid webhook signature
 */
async function testInvalidSignature() {
    console.log('\n📝 Test 2: Invalid Webhook Signature');
    console.log('='.repeat(50));

    const payload = {
        checkoutId: TEST_CHECKOUT_ID,
        result: {
            code: '000.000.000',
            description: 'Transaction successful'
        }
    };

    const invalidSignature = 'INVALID_SIGNATURE_12345';

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Invalid Signature:', invalidSignature);

    try {
        const response = await axios.post(
            `${BASE_URL}/api/payments/callback/${TEST_ORDER_ID}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-hyperpay-signature': invalidSignature
                }
            }
        );

        console.log('❌ TEST FAILED: Should have been rejected (got', response.status, ')');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ CORRECTLY REJECTED:', error.response.status);
            console.log('Error Message:', error.response.data?.message);
            return true;
        } else {
            console.log('❌ UNEXPECTED ERROR:', error.response?.status, error.message);
            return false;
        }
    }
}

/**
 * Test 3: Missing signature
 */
async function testMissingSignature() {
    console.log('\n📝 Test 3: Missing Webhook Signature');
    console.log('='.repeat(50));

    const payload = {
        checkoutId: TEST_CHECKOUT_ID,
        result: {
            code: '000.000.000',
            description: 'Transaction successful'
        }
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Signature: (none)');

    try {
        const response = await axios.post(
            `${BASE_URL}/api/payments/callback/${TEST_ORDER_ID}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('❌ TEST FAILED: Should have been rejected (got', response.status, ')');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ CORRECTLY REJECTED:', error.response.status);
            console.log('Error Message:', error.response.data?.message);
            return true;
        } else {
            console.log('❌ UNEXPECTED ERROR:', error.response?.status, error.message);
            return false;
        }
    }
}

/**
 * Test 4: Signature tampering detection
 */
async function testSignatureTampering() {
    console.log('\n📝 Test 4: Signature Tampering Detection');
    console.log('='.repeat(50));

    const payload = {
        checkoutId: TEST_CHECKOUT_ID,
        result: {
            code: '000.000.000',
            description: 'Transaction successful'
        }
    };

    // Generate valid signature
    const validSignature = generateSignature(payload);

    // Tamper with payload but keep same signature
    payload.result.code = '999.999.999'; // Changed!

    console.log('Original Signature:', validSignature);
    console.log('Tampered Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(
            `${BASE_URL}/api/payments/callback/${TEST_ORDER_ID}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-hyperpay-signature': validSignature
                }
            }
        );

        console.log('❌ TEST FAILED: Tampering not detected (got', response.status, ')');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ TAMPERING DETECTED:', error.response.status);
            console.log('Error Message:', error.response.data?.message);
            return true;
        } else {
            console.log('❌ UNEXPECTED ERROR:', error.response?.status, error.message);
            return false;
        }
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n🧪 WEBHOOK SIGNATURE VALIDATION TESTS');
    console.log('='.repeat(50));
    console.log('Backend URL:', BASE_URL);
    console.log('Test Order ID:', TEST_ORDER_ID);
    console.log('Webhook Secret:', WEBHOOK_SECRET.substring(0, 10) + '...');

    const results = {
        validSignature: await testValidSignature(),
        invalidSignature: await testInvalidSignature(),
        missingSignature: await testMissingSignature(),
        signatureTampering: await testSignatureTampering()
    };

    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('Valid Signature:', results.validSignature ? '✅ PASS' : '❌ FAIL');
    console.log('Invalid Signature (rejected):', results.invalidSignature ? '✅ PASS' : '❌ FAIL');
    console.log('Missing Signature (rejected):', results.missingSignature ? '✅ PASS' : '❌ FAIL');
    console.log('Tampering Detection:', results.signatureTampering ? '✅ PASS' : '❌ FAIL');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;

    console.log('\n' + '='.repeat(50));
    console.log(`RESULT: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED!');
        process.exit(0);
    } else {
        console.log('⚠️ SOME TESTS FAILED');
        process.exit(1);
    }
}

// Usage instructions
if (process.argv[2] === '--help') {
    console.log(`
Usage: node test-webhook-security.js

Environment Variables:
  HYPERPAY_WEBHOOK_SECRET - Webhook secret key (default: test-secret-key)

Before running:
1. Update TEST_ORDER_ID with a real order ID from your database
2. Update TEST_CHECKOUT_ID with matching checkout ID
3. Ensure backend is running on http://localhost:5000
4. Set HYPERPAY_WEBHOOK_SECRET to match backend .env

Example:
  HYPERPAY_WEBHOOK_SECRET=your_secret node test-webhook-security.js
    `);
    process.exit(0);
}

// Run tests
runAllTests().catch(console.error);
