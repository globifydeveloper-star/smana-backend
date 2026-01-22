const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
    email: 'user1@gmail.com',
    password: 'password123'
};

// Test state
let authToken = '';
let userId = '';
let checkoutId = '';
let orderId = '';

/**
 * Test 1: User Login
 */
async function testLogin() {
    console.log('\n=== TEST 1: USER LOGIN ===');

    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);

        if (response.status === 200 && response.data.token) {
            authToken = response.data.token;
            userId = response.data._id;

            console.log('✅ LOGIN SUCCESS');
            console.log('User ID:', userId);
            console.log('Token:', authToken.substring(0, 20) + '...');
            return { success: true, data: response.data };
        } else {
            console.log('❌ LOGIN FAILED: Invalid response');
            return { success: false, error: 'Invalid response' };
        }
    } catch (error) {
        console.log('❌ LOGIN FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 2: Get Menu Items
 */
async function testGetMenuItems() {
    console.log('\n=== TEST 2: GET MENU ITEMS ===');

    try {
        const response = await axios.get(`${BASE_URL}/api/menu-items`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.status === 200 && response.data.length > 0) {
            console.log('✅ MENU ITEMS FETCHED');
            console.log(`Found ${response.data.length} menu items`);
            console.log('Sample items:', response.data.slice(0, 3).map(i => ({
                name: i.name,
                price: i.price,
                id: i._id
            })));
            return { success: true, data: response.data };
        } else {
            console.log('❌ NO MENU ITEMS FOUND');
            return { success: false, error: 'No menu items' };
        }
    } catch (error) {
        console.log('❌ FAILED TO GET MENU:', error.response?.data?.message || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 3: Create Checkout (Initiate Payment)
 */
async function testCreateCheckout(menuItems) {
    console.log('\n=== TEST 3: CREATE CHECKOUT ===');

    // Select first 2 menu items for order
    const orderItems = menuItems.slice(0, 2).map(item => ({
        menuItemId: item._id,
        quantity: 1
    }));

    const checkoutData = {
        items: orderItems,
        roomNumber: '101',
        notes: 'Test order from automated script',
        currency: 'AED',
        customerEmail: TEST_USER.email,
        billingAddress: {
            givenName: 'Test',
            surname: 'User',
            street1: '123 Test Street',
            city: 'Dubai',
            state: 'Dubai',
            country: 'AE',
            postcode: '12345'
        }
    };

    try {
        const response = await axios.post(
            `${BASE_URL}/api/payments/checkout`,
            checkoutData,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (response.status === 200 && response.data.checkoutId) {
            checkoutId = response.data.checkoutId;
            orderId = response.data.orderId;

            console.log('✅ CHECKOUT CREATED');
            console.log('Checkout ID:', checkoutId);
            console.log('Order ID:', orderId);
            console.log('Amount:', response.data.amount, response.data.currency);
            console.log('Integrity Hash:', response.data.integrity ? 'Present' : 'Missing');
            return { success: true, data: response.data };
        } else {
            console.log('❌ CHECKOUT FAILED: Invalid response');
            return { success: false, error: 'Invalid response' };
        }
    } catch (error) {
        console.log('❌ CHECKOUT FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 4: Simulate Payment Success
 */
async function testPaymentSuccess() {
    console.log('\n=== TEST 4: PAYMENT VERIFICATION (SUCCESS SIMULATION) ===');
    console.log('⚠️  Note: This simulates checking payment status');
    console.log('⚠️  Actual payment requires using HyperPay test card in mobile app');

    try {
        // Wait a bit to simulate payment processing
        console.log('Waiting 3 seconds to simulate payment...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await axios.get(
            `${BASE_URL}/api/payments/status/${checkoutId}`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('Payment Status Response:');
        console.log('  Success:', response.data.success);
        console.log('  Pending:', response.data.pending);
        console.log('  Payment Status:', response.data.paymentStatus);
        console.log('  Result Code:', response.data.result?.code);

        return { success: true, data: response.data };
    } catch (error) {
        console.log('❌ PAYMENT STATUS CHECK FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 5: Verify Order Status
 */
async function testOrderStatus() {
    console.log('\n=== TEST 5: VERIFY ORDER STATUS ===');

    try {
        const response = await axios.get(
            `${BASE_URL}/api/food-orders`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        const order = response.data.orders.find(o => o._id === orderId);

        if (order) {
            console.log('✅ ORDER FOUND');
            console.log('Order ID:', order._id);
            console.log('Status:', order.status);
            console.log('Payment Status:', order.paymentStatus);
            console.log('Total Amount:', order.totalAmount, order.currency);
            console.log('Room Number:', order.roomNumber);

            return { success: true, data: order };
        } else {
            console.log('❌ ORDER NOT FOUND');
            return { success: false, error: 'Order not found' };
        }
    } catch (error) {
        console.log('❌ FAILED TO GET ORDER:', error.response?.data?.message || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Generate Test Report
 */
function generateReport(results) {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('AUTOMATED TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Test Date: ${new Date().toISOString()}`);
    console.log(`Backend URL: ${BASE_URL}`);
    console.log(`Test User: ${TEST_USER.email}`);
    console.log('='.repeat(60));

    const tests = [
        { name: 'User Login', result: results.login },
        { name: 'Get Menu Items', result: results.menuItems },
        { name: 'Create Checkout', result: results.checkout },
        { name: 'Payment Verification', result: results.payment },
        { name: 'Order Status Check', result: results.orderStatus }
    ];

    tests.forEach((test, index) => {
        const status = test.result?.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${test.name}: ${status}`);
        if (!test.result?.success && test.result?.error) {
            console.log(`   Error: ${test.result.error}`);
        }
    });

    const passedTests = tests.filter(t => t.result?.success).length;
    const totalTests = tests.length;

    console.log('='.repeat(60));
    console.log(`RESULT: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    if (passedTests === totalTests) {
        console.log('🎉 ALL AUTOMATED TESTS PASSED!');
        console.log('\n⚠️  IMPORTANT: Complete manual testing in mobile app:');
        console.log('   - Use test card: 4440000009900010');
        console.log('   - Complete 3D Secure authentication');
        console.log('   - Verify payment success flow');
        console.log('   - Test payment cancellation');
    } else {
        console.log('⚠️  SOME TESTS FAILED - Please review errors above');
    }
    console.log('='.repeat(60));
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🧪 STARTING AUTOMATED FOOD ORDERING TESTS');
    console.log('='.repeat(60));

    const results = {};

    // Test 1: Login
    results.login = await testLogin();
    if (!results.login.success) {
        console.log('\n❌ CRITICAL: Login failed, cannot proceed with other tests');
        generateReport(results);
        return;
    }

    // Test 2: Get Menu Items
    results.menuItems = await testGetMenuItems();
    if (!results.menuItems.success || !results.menuItems.data.length) {
        console.log('\n❌ CRITICAL: No menu items, cannot create order');
        generateReport(results);
        return;
    }

    // Test 3: Create Checkout
    results.checkout = await testCreateCheckout(results.menuItems.data);
    if (!results.checkout.success) {
        console.log('\n❌ CRITICAL: Checkout creation failed');
        generateReport(results);
        return;
    }

    // Test 4: Payment Status (will be pending until actual payment in mobile app)
    results.payment = await testPaymentSuccess();

    // Test 5: Order Status
    results.orderStatus = await testOrderStatus();

    // Generate report
    generateReport(results);

    console.log('\n📝 NEXT STEPS:');
    console.log('1. Open mobile app and login with:', TEST_USER.email);
    console.log('2. Use Checkout ID:', checkoutId);
    console.log('3. Complete payment with test card: 4440000009900010');
    console.log('4. Follow manual_test_guide.md for complete testing');
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});

// Run tests
runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});
