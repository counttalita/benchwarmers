# Payment System Quick Reference

## Environment Variables

```bash
PAYSTACK_PUBLIC_KEY=pk_test_17888922be48dfe8b87c86a4cec5eaae533f06c0
PAYSTACK_SECRET_KEY=sk_test_564758713eb90887f7d1a4c91a74ab46b12b66da
PAYSTACK_WEBHOOK_SECRET=whsec_test_mock_secret
PAYSTACK_PLAN_CODE=PLN_npx4dizl78ab5i9
```

## Key Classes & Services

### PaymentManager
```typescript
import { paymentManager } from '@/lib/payments/payment-manager'

// Create subscription
await paymentManager.createSubscription({
  customer: 'customer_code',
  plan: 'PLN_npx4dizl78ab5i9'
})

// Calculate facilitation fee
const fee = paymentManager.calculateFacilitationFee(10000) // R500

// Process webhook
const event = await paymentManager.processWebhook(payload, signature)
```

### SubscriptionService
```typescript
import { subscriptionService } from '@/lib/payments/subscription-service'

// Check subscription status
const status = await subscriptionService.getSubscriptionStatus(userId)

// Create subscription
await subscriptionService.createSubscription({
  userId: 'user_123',
  email: 'user@example.com',
  planType: 'monthly'
})
```

## API Endpoints

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions` - Get subscription status
- `POST /api/subscriptions/cancel` - Cancel subscription

### Payments
- `POST /api/payments/process` - Process facilitation fee
- `POST /api/payments/release` - Release escrow payment
- `POST /api/payments/hold` - Hold payment (disputes)

### Webhooks
- `POST /api/webhooks/paystack` - Paystack webhook handler

## Database Models

### Subscription
```typescript
{
  id: string
  userId: string
  paystackSubscriptionId: string
  planType: 'monthly' | 'yearly'
  amount: Decimal // 850
  currency: 'ZAR'
  status: 'active' | 'cancelled'
  nextBillingDate: Date
}
```

### Transaction
```typescript
{
  id: string
  engagementId?: string
  type: 'payment' | 'transfer' | 'refund' | 'fee'
  amount: Decimal
  facilitationFee?: Decimal // 5% of amount
  currency: 'ZAR'
  status: 'pending' | 'completed' | 'failed'
  paystackPaymentId?: string
}
```

## Common Patterns

### 1. Subscription Check
```typescript
const hasSubscription = await subscriptionService.hasActiveSubscription(userId)
if (!hasSubscription) {
  throw new Error('Subscription required')
}
```

### 2. Facilitation Fee Calculation
```typescript
const projectAmount = 10000
const facilitationFee = paymentManager.calculateFacilitationFee(projectAmount)
const netAmount = paymentManager.calculateNetAmount(projectAmount)
```

### 3. Payment Release
```typescript
const result = await paymentManager.releasePayment({
  engagementId: 'eng_123',
  amount: 5000,
  currency: 'ZAR',
  reason: 'milestone',
  verificationData: {
    deliverables: ['feature1'],
    approvedBy: 'user_123',
    approvedAt: new Date()
  }
})
```

### 4. Webhook Handling
```typescript
// In webhook handler
switch (event.event) {
  case 'charge.success':
    await handlePaymentSuccess(event.data)
    break
  case 'subscription.create':
    await handleSubscriptionCreated(event.data)
    break
  case 'transfer.success':
    await handleTransferSuccess(event.data)
    break
}
```

## Error Handling

### Payment Errors
```typescript
try {
  await paymentManager.createTransfer(transferData)
} catch (error) {
  if (error.message.includes('Insufficient funds')) {
    // Handle insufficient funds
  } else if (error.message.includes('Invalid recipient')) {
    // Handle invalid recipient
  }
}
```

### Webhook Errors
```typescript
try {
  const event = await paymentManager.processWebhook(payload, signature)
} catch (error) {
  if (error.message.includes('Invalid webhook signature')) {
    // Log security issue
  }
}
```

## Testing

### Mock Payment Processing
```typescript
// In test setup
jest.mock('@/lib/payments/payment-manager', () => ({
  paymentManager: {
    createSubscription: jest.fn().mockResolvedValue({ success: true }),
    calculateFacilitationFee: jest.fn().mockReturnValue(500),
    processWebhook: jest.fn().mockResolvedValue({ event: 'charge.success' })
  }
}))
```

### Test Data
```typescript
const mockSubscription = {
  id: 'sub_123',
  userId: 'user_123',
  paystackSubscriptionId: 'SUB_test123',
  planType: 'monthly',
  amount: 850,
  currency: 'ZAR',
  status: 'active'
}

const mockTransaction = {
  id: 'txn_123',
  engagementId: 'eng_123',
  type: 'payment',
  amount: 10000,
  facilitationFee: 500,
  currency: 'ZAR',
  status: 'completed'
}
```

## Security Checklist

- [ ] Webhook signature verification
- [ ] No sensitive data in logs
- [ ] Input validation on all endpoints
- [ ] Rate limiting on payment endpoints
- [ ] Audit logging for all transactions
- [ ] Error messages don't leak sensitive info

## Monitoring

### Key Metrics to Track
- Payment success rate
- Subscription churn rate
- Average transaction value
- Webhook processing time
- Failed payment attempts

### Alerts to Set Up
- Payment failure rate > 5%
- Webhook processing errors
- Subscription cancellations
- High dispute rates
