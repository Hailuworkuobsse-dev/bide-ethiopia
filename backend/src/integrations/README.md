# Payment integration boundary

This folder defines the adapter contract only. There is deliberately no fake CBE Birr or Telebirr adapter and no endpoint that pretends a payment has succeeded.

Before production integration:
1. Obtain approved merchant access and current API specifications from each provider.
2. Store credentials in the deployment secret manager.
3. Verify callbacks using provider-specified cryptographic signatures against the raw request body.
4. Enforce idempotency, compare callback amount/currency/provider reference, and reconcile provider reports.
5. Never mark a payment paid from a browser redirect alone.
6. Have qualified legal/compliance partners validate the escrow/custody model, KYC/AML, consumer protection, refunds and dispute handling.
