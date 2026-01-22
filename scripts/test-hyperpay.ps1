# HyperPay Payment Integration Test Script (PowerShell)

Write-Host "=====================================" -ForegroundColor Green
Write-Host "HyperPay Payment Integration Test" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Base URL
$BASE_URL = "http://localhost:5000/api"

# Test credentials (you'll need to replace with actual JWT token)
$JWT_TOKEN = "YOUR_JWT_TOKEN_HERE"

Write-Host "Step 1: Testing Backend Health" -ForegroundColor Yellow
Write-Host "-------------------------------------"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/" -Method Get -UseBasicParsing
    Write-Host "✓ Backend is running!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "✗ Backend not running!" -ForegroundColor Red
}
Write-Host ""
Write-Host ""

Write-Host "Step 2: Create Test Checkout Session" -ForegroundColor Yellow
Write-Host "-------------------------------------"
Write-Host "Endpoint: POST $BASE_URL/payments/checkout"
Write-Host ""

# Test checkout request
$body = @{
    orderId = "test-order-123"
    amount = "100.00"
    currency = "AED"
    customerEmail = "test@example.com"
    billingAddress = @{
        givenName = "John"
        surname = "Doe"
        street1 = "123 Test Street"
        city = "Dubai"
        state = "Dubai"
        country = "AE"
        postcode = "12345"
    }
} | ConvertTo-Json

Write-Host "Request Body:"
Write-Host $body -ForegroundColor Cyan
Write-Host ""

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $JWT_TOKEN"
    }
    
    $checkoutResponse = Invoke-RestMethod -Uri "$BASE_URL/payments/checkout" -Method Post -Body $body -Headers $headers
    Write-Host "✓ Checkout Created Successfully!" -ForegroundColor Green
    Write-Host ($checkoutResponse | ConvertTo-Json -Depth 10) -ForegroundColor Cyan
    
    $checkoutId = $checkoutResponse.checkoutId
    Write-Host ""
    Write-Host "Checkout ID: $checkoutId" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Error creating checkout:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ""
Write-Host "Step 3: Get Payment Status" -ForegroundColor Yellow
Write-Host "-------------------------------------"
Write-Host "Replace CHECKOUT_ID with actual checkout ID from Step 2"
Write-Host "Endpoint: GET $BASE_URL/payments/status/CHECKOUT_ID"
Write-Host ""

# If checkout was successful, you can test status check here
# if ($checkoutId) {
#     try {
#         $statusResponse = Invoke-RestMethod -Uri "$BASE_URL/payments/status/$checkoutId" -Method Get -Headers $headers
#         Write-Host ($statusResponse | ConvertTo-Json -Depth 10) -ForegroundColor Cyan
#     } catch {
#         Write-Host "Error getting payment status:" -ForegroundColor Red
#         Write-Host $_.Exception.Message -ForegroundColor Red
#     }
# }

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Test Script Complete" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "For manual testing:" -ForegroundColor Yellow
Write-Host "1. Get a JWT token by logging into the app"
Write-Host "2. Replace JWT_TOKEN variable in this script"
Write-Host "3. Run this script to test checkout creation"
Write-Host "4. Use the returned checkout ID to test payment status"
Write-Host ""
Write-Host "Test Cards:" -ForegroundColor Yellow
Write-Host "  VISA Success: 4440000009900010 CVV:100 Expiry:01/39"
Write-Host "  MasterCard Success: 5123450000000008 CVV:100 Expiry:01/39"
Write-Host "  Failed Payment: 5204730000002514 CVV:251 Expiry:01/39"
