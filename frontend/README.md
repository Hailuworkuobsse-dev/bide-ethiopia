# BidEthiopia — Ethiopian Auction Marketplace

A mobile-first auction marketplace scaffold for Ethiopian buyers and sellers, built with React, TypeScript, TanStack Router, Vite, and Tailwind CSS.

## Project workspace

- Lovable editor: https://lovable.dev/projects/790ce50c-8d7a-4fdd-afb6-28835c043ae6
- Lovable preview: https://id-preview--790ce50c-8d7a-4fdd-afb6-28835c043ae6.lovable.app

## Current scaffold

The source includes public auction browsing, listing and auction-detail routes, account/admin/integration/notification/token screens, auction types and bidding utilities, seeded demo data, shared UI components, and tests.

## Run locally

Install Bun, then:

```bash
bun install
bun run dev
```

Build and test:

```bash
bun run build
bun run test
```

Use the package scripts in `package.json` as the source of truth for available commands.

## Important implementation notes

- This repository is a source transfer of the current Lovable scaffold, not a claim that every production requirement is complete.
- CBE Birr, Telebirr, escrow, identity verification, voice interfaces, multilingual AI, and payment settlement must be verified and integrated with authorized provider APIs before handling real transactions.
- Never store payment secrets in frontend code or commit credentials. Configure secrets through the deployment environment.
- Binary demo assets (the four category JPEGs and favicon) were not included in this connector-based source transfer; restore them from the Lovable project or replace them with licensed assets before building/deploying if imports require them.


## Node.js backend

The initial REST API is in [`backend/`](backend/README.md). It uses Node.js, TypeScript, Express, Prisma and MySQL, with JWT authentication, buyer/seller/admin authorization, auction listing and bidding endpoints, account moderation and audit logs.

Start with [backend setup instructions](backend/README.md) and copy [`backend/.env.example`](backend/.env.example) to `backend/.env`. The CI workflow validates the Prisma schema and TypeScript build.

This is a backend foundation, not a finished production payment platform. CBE Birr and Telebirr payment APIs, legally compliant escrow, verified callbacks, KYC/AML and settlement reconciliation must be integrated and tested before live payments.
