# BidEthiopia API

Node.js + TypeScript REST API using Express 5 and Prisma/MySQL. This is an initial backend foundation; it is not yet a production escrow or payment settlement system.

## Requirements
- Node.js 20+
- MySQL 8+
- npm

## Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and set a unique `JWT_ACCESS_SECRET` and a valid MySQL `DATABASE_URL`.
4. `npm run prisma:generate`
5. `npm run prisma:migrate -- --name init`
6. `npm run dev`

API base: `http://localhost:4000/api/v1`; health: `/health`.

## Initial endpoints
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auctions`
- `GET /api/v1/auctions/:id`
- `POST /api/v1/auctions` (seller/admin)
- `POST /api/v1/auctions/:id/bids` (authenticated)
- `GET /api/v1/admin/audit-events` (admin)

Bidding is transactional and rechecks auction status, timing, and minimum bid inside the database transaction. Production deployments should additionally use MySQL integration tests and consider row-level locking/isolation for high-contention auctions.

## Payments
The schema tracks payment-provider references, but no provider is called and no money is moved by this scaffold. Implement and certify CBE Birr/Telebirr APIs, verified callbacks, reconciliation, refunds, KYC/AML and legal escrow arrangements before live use. Never put provider secrets in frontend code.
