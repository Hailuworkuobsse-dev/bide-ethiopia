/**
 * Provider contract only. No provider is configured by this repository yet.
 * Implement with the official merchant APIs and verified webhook signatures
 * before creating real payment intents or treating callbacks as settlement.
 */
export type PaymentIntentRequest = {
  paymentId: string;
  amount: string;
  currency: "ETB";
  description: string;
  returnUrl?: string;
};

export type PaymentIntentResult = {
  providerReference: string;
  checkoutUrl?: string;
  status: "PENDING";
};

export interface PaymentProviderAdapter {
  readonly provider: "TELEBIRR" | "CBE_BIRR";
  createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult>;
  verifyCallback(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<{
    providerReference: string;
    status: "PAID" | "FAILED" | "CANCELLED";
    amount: string;
    currency: "ETB";
  }>;
}
