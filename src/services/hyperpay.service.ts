import axios, { AxiosInstance } from 'axios';

interface BillingAddress {
    givenName: string;
    surname: string;
    street1: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
}

interface CheckoutRequest {
    amount: string;
    currency: 'AED' | 'USD';
    paymentType: 'DB';
    merchantTransactionId: string;
    customerEmail: string;
    billingAddress: BillingAddress;
}

interface CheckoutResponse {
    id: string;
    integrity?: string; // PCI DSS v4.0 - Subresource Integrity hash
    result: {
        code: string;
        description: string;
    };
    buildNumber: string;
    timestamp: string;
    ndc: string;
}

interface PaymentStatusResponse {
    id: string;
    paymentType: string;
    paymentBrand: string;
    amount: string;
    currency: string;
    descriptor: string;
    result: {
        code: string;
        description: string;
    };
    resultDetails?: {
        ConnectorTxID1?: string;
        clearingInstituteName?: string;
    };
    card?: {
        bin: string;
        last4Digits: string;
        holder: string;
        expiryMonth: string;
        expiryYear: string;
    };
    customer?: {
        email: string;
        givenName: string;
        surname: string;
    };
    billing?: BillingAddress;
    merchantTransactionId: string;
    timestamp: string;
    ndc: string;
}

class HyperPayService {
    private client: AxiosInstance;
    private baseUrl: string;
    private accessToken: string;
    private entityIdAED: string;
    private entityIdUSD: string;
    private mode: string;

    constructor() {
        this.baseUrl = process.env.HYPERPAY_BASE_URL || 'https://eu-test.oppwa.com';
        this.accessToken = process.env.HYPERPAY_ACCESS_TOKEN || '';
        this.entityIdAED = process.env.HYPERPAY_ENTITY_ID_AED || '';
        this.entityIdUSD = process.env.HYPERPAY_ENTITY_ID_USD || '';
        this.mode = process.env.HYPERPAY_MODE || 'test';

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    /**
     * Step 1: Prepare the checkout
     * Send the request parameters server-to-server to prepare the payment form.
     */
    async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
        try {
            const path = '/v1/checkouts';
            const entityId = data.currency === 'AED' ? this.entityIdAED : this.entityIdUSD;

            const params = new URLSearchParams();
            params.append('entityId', entityId);

            // Format amount to xx.00 for test mode as requested
            let formattedAmount = data.amount;
            if (this.mode === 'test') {
                // Ensure it has 2 decimal places and ends in .00 if it's a whole number
                try {
                    const val = parseFloat(data.amount);
                    formattedAmount = Math.floor(val).toFixed(2); // Force to xx.00
                } catch (e) {
                    formattedAmount = data.amount;
                }
            }
            params.append('amount', formattedAmount);

            params.append('currency', data.currency);
            params.append('paymentType', 'DB');
            params.append('integrity', 'true');

            // Test mode parameters (only for test server)
            if (this.mode === 'test') {
                params.append('testMode', 'EXTERNAL');
                params.append('customParameters[3DS2_enrolled]', 'true');
            }

            // Optional: Add other parameters if needed, but keeping it minimal as per guide
            // The guide doesn't explicitly mandate billing params for the simplest integration, 
            // but they are often required for risk checks. I'll include them if available.
            if (data.merchantTransactionId) {
                params.append('merchantTransactionId', data.merchantTransactionId);
            }
            if (data.customerEmail) {
                params.append('customer.email', data.customerEmail);
            }
            if (data.billingAddress) {
                params.append('billing.street1', data.billingAddress.street1);
                params.append('billing.city', data.billingAddress.city);
                params.append('billing.state', data.billingAddress.state);
                params.append('billing.country', data.billingAddress.country);
                params.append('billing.postcode', data.billingAddress.postcode);
                params.append('customer.givenName', data.billingAddress.givenName);
                params.append('customer.surname', data.billingAddress.surname);
            }

            console.log('[HyperPay] Step 1: Preparing checkout', {
                amount: formattedAmount,
                currency: data.currency,
                entityId: entityId.substring(0, 8) + '...',
                mode: this.mode
            });

            const response = await this.client.post<CheckoutResponse>(path, params.toString());

            return response.data;
        } catch (error: any) {
            console.error('[HyperPay] Prepare checkout failed:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.result?.description ||
                'Failed to prepare checkout'
            );
        }
    }

    /**
     * Step 3: Get the payment status
     * Find out if the payment was successful.
     */
    async getPaymentStatus(checkoutId: string, currency: 'AED' | 'USD'): Promise<PaymentStatusResponse> {
        try {
            // resourcePath=/v1/checkouts/{checkoutId}/payment
            const resourcePath = `/v1/checkouts/${checkoutId}/payment`;
            const entityId = currency === 'AED' ? this.entityIdAED : this.entityIdUSD;

            console.log('[HyperPay] Step 3: Getting payment status', { checkoutId });

            const response = await this.client.get<PaymentStatusResponse>(resourcePath, {
                params: {
                    entityId: entityId
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('[HyperPay] Get payment status failed:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.result?.description ||
                'Failed to get payment status'
            );
        }
    }

    /**
     * Check if payment was successful based on result code
     * Success codes pattern: /^(000\.000\.|000\.100\.1|000\.[36])/
     */
    isPaymentSuccessful(resultCode: string): boolean {
        const successPattern = /^(000\.000\.|000\.100\.1|000\.[36])/;
        return successPattern.test(resultCode);
    }

    /**
     * Check if payment is pending (waiting for async completion)
     * Pending codes pattern: /^(000\.200)/
     */
    isPaymentPending(resultCode: string): boolean {
        const pendingPattern = /^(000\.200)/;
        return pendingPattern.test(resultCode);
    }
    /**
     * Step 1 (Tokenization): Prepare the registration
     * Send request to prepare the registration form.
     */
    async createRegistration(customerEmail: string, billingAddress: BillingAddress): Promise<CheckoutResponse> {
        try {
            const path = '/v1/checkouts';
            const entityId = this.entityIdAED; // Registration usually doesn't depend on currency, but entity is needed. Using AED entity.

            const params = new URLSearchParams();
            params.append('entityId', entityId);
            params.append('createRegistration', 'true');

            // Test mode parameters
            if (this.mode === 'test') {
                params.append('testMode', 'EXTERNAL');
            }

            // Optional: Add other parameters if needed for risk checks
            if (customerEmail) {
                params.append('customer.email', customerEmail);
            }
            if (billingAddress) {
                params.append('billing.street1', billingAddress.street1);
                params.append('billing.city', billingAddress.city);
                params.append('billing.state', billingAddress.state);
                params.append('billing.country', billingAddress.country);
                params.append('billing.postcode', billingAddress.postcode);
                params.append('customer.givenName', billingAddress.givenName);
                params.append('customer.surname', billingAddress.surname);
            }

            console.log('[HyperPay] Creating registration session');

            const response = await this.client.post<CheckoutResponse>(path, params.toString());
            return response.data;
        } catch (error: any) {
            console.error('[HyperPay] Create registration failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.result?.description || 'Failed to create registration session');
        }
    }

    /**
     * Step 3 (Tokenization): Get the registration status
     * Find out if the registration token was successful.
     */
    async getRegistrationStatus(checkoutId: string): Promise<PaymentStatusResponse> {
        try {
            // resourcePath=/v1/checkouts/{checkoutId}/registration
            const resourcePath = `/v1/checkouts/${checkoutId}/registration`;
            const entityId = this.entityIdAED;

            console.log('[HyperPay] Checking registration status', { checkoutId });

            const response = await this.client.get<PaymentStatusResponse>(resourcePath, {
                params: { entityId }
            });

            return response.data;
        } catch (error: any) {
            console.error('[HyperPay] Get registration status failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.result?.description || 'Failed to get registration status');
        }
    }

    /**
     * Step 4 (Tokenization): Send payment using the token
     * Perform a server-to-server POST request over the registration token.
     */
    async payWithToken(registrationId: string, amount: string, currency: 'AED' | 'USD'): Promise<PaymentStatusResponse> {
        try {
            // path=/v1/registrations/{id}/payments
            const path = `/v1/registrations/${registrationId}/payments`;
            const entityId = currency === 'AED' ? this.entityIdAED : this.entityIdUSD;

            const params = new URLSearchParams();
            params.append('entityId', entityId);
            params.append('amount', amount);
            params.append('currency', currency);
            params.append('paymentType', 'DB');
            params.append('paymentBrand', 'VISA'); // TODO: Store brand with token or pass dynamically

            // Recurring/Standing Instruction parameters are often required for token transactions
            params.append('standingInstruction.type', 'UNSCHEDULED');
            params.append('standingInstruction.mode', 'INITIAL');
            params.append('standingInstruction.source', 'CIT');

            if (this.mode === 'test') {
                params.append('testMode', 'EXTERNAL');
            }

            console.log('[HyperPay] Paying with token', { registrationId, amount, currency });

            const response = await this.client.post<PaymentStatusResponse>(path, params.toString());
            return response.data;

        } catch (error: any) {
            console.error('[HyperPay] Pay with token failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.result?.description || 'Failed to process payment with token');
        }
    }
}

export const hyperPayService = new HyperPayService();
export type { CheckoutRequest, CheckoutResponse, PaymentStatusResponse, BillingAddress };
