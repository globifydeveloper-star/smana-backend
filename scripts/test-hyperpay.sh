#!/bin/bash
# HyperPay Payment Integration Test Script

echo "====================================="
echo "HyperPay Payment Integration Test"
echo "====================================="
echo ""

# Base URL
BASE_URL="http://localhost:5000/api"

# Test credentials (you'll need to replace with actual JWT token)
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

echo "Step 1: Testing Backend Health"
echo "-------------------------------------"
curl -s http://localhost:5000/ || echo "Backend not running!"
echo ""
echo ""

echo "Step 2: Create Test Checkout Session"
echo "-------------------------------------"
echo "Endpoint: POST $BASE_URL/payments/checkout"
echo ""

# Test checkout request
curl -X POST "$BASE_URL/payments/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "orderId": "test-order-123",
    "amount": "100.00",
    "currency": "AED",
    "customerEmail": "test@example.com",
    "billingAddress": {
      "givenName": "John",
      "surname": "Doe",
      "street1": "123 Test Street",
      "city": "Dubai",
      "state": "Dubai",
      "country": "AE",
      "postcode": "12345"
    }
  }' | json_pp

echo ""
echo ""
echo "Step 3: Get Payment Status"
echo "-------------------------------------"
echo "Replace CHECKOUT_ID with actual checkout ID from Step 2"
echo "Endpoint: GET $BASE_URL/payments/status/CHECKOUT_ID"
echo ""

# Uncomment and replace CHECKOUT_ID when you have one
# curl -X GET "$BASE_URL/payments/status/CHECKOUT_ID" \
#   -H "Authorization: Bearer $JWT_TOKEN" | json_pp

echo ""
echo "====================================="
echo "Test Script Complete"
echo "====================================="
echo ""
echo "For manual testing:"
echo "1. Get a JWT token by logging into the app"
echo "2. Replace JWT_TOKEN in this script"
echo "3. Run this script to test checkout creation"
echo "4. Use the returned checkout ID to test payment status"
echo ""
echo "Test Cards:"
echo "  VISA Success: 4440000009900010 CVV:100 Expiry:01/39"
echo "  MasterCard Success: 5123450000000008 CVV:100 Expiry:01/39"
echo "  Failed Payment: 5204730000002514 CVV:251 Expiry:01/39"
