# PetID

> ENS-powered identity for pets. Mint a `*.dogid.eth` or `*.catid.eth` subname, host a pet profile on IPFS, and print a QR collar tag that helps strangers reunite you with your lost pet.

PetID is a Web3 take on the pet ID tag. Instead of an engraved phone number, your pet gets a permanent, on-chain identity (an ENS subname) and a tamper-proof profile page hosted on IPFS. A scannable QR code on the collar resolves to that profile in any browser — no app, no account, no central server.

---

## Two apps, one protocol

This repository ships the **fiat + crypto** version of PetID, designed for Cloudflare Pages with a Railway worker. The **live production app** is the crypto-only IPFS build at [`petid-eth-ipfs`](../petid-eth-ipfs), served from `petid.eth`. This repo is paused pending a new payment merchant for the fiat flow.

| | `petid-eth` (this repo) | `petid-eth-ipfs` ✅ live |
|---|---|---|
| Status | Paused — awaiting new payment merchant | **Live at `petid.eth`** |
| Payment | Helio (card / crypto, $19.99) **or** on-chain ETH | On-chain ETH only |
| Hosting | Cloudflare Pages | IPFS → `petid.eth` |
| Backend | Supabase + Railway worker | None (fully client-side) |
| Pinata | Server-side SDK | Browser scoped JWT |
| Mint | Worker mints on behalf of user (fiat flow) | User mints directly from wallet |
| Audience | Mainstream pet owners | Crypto-native users |

Both apps mint into the same `PetSubnameRegistrar` contract on Ethereum mainnet, so a name minted from either flow is indistinguishable on-chain.

---

## How it works

```
   ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
   │  Wizard  │──▶│  Payment │──▶│   IPFS upload │──▶│  ENS mint │
   └──────────┘    └──────────┘    └──────────────┘    └──────────┘
       │              │                  │                   │
   pet details   Helio or wallet    photo + profile      subname +
                                    HTML (CIDv1)        contenthash
```

1. Owner fills in pet info, picks `dogid.eth` or `catid.eth`, chooses a subname.
2. Pays $19.99 via Helio (card or crypto) **or** 0.00825 ETH directly from their wallet.
3. Photo and a generated profile HTML page are uploaded to IPFS via Pinata (CIDv1, `bafy…`).
4. The `PetSubnameRegistrar` contract mints the subname under `dogid.eth` / `catid.eth` and sets the IPFS `contenthash` on the resolver.
5. The owner gets a printable QR collar tag pointing to `https://<subname>.dogid.eth.link`.

If the pet is found, a stranger scans the QR. The profile resolves through any ENS gateway, no app or account required.

---

## Stack

**Frontend**
- Next.js 15.5.2 (App Router, edge runtime) — pinned because `@cloudflare/next-on-pages` caps at 15.5.2
- React 19
- Tailwind CSS v4
- RainbowKit + wagmi v2 + viem (crypto-native flow)
- Handlebars (profile template rendering)
- `qrcode` (QR generation)

**Backend / infra**
- Cloudflare Pages (`wrangler pages deploy`)
- Supabase Postgres (pet record + mint status)
- Pinata (IPFS pinning, `cidVersion: 1`)
- Helio (payments — replaces Stripe; supports card and crypto)
- Resend (transactional email)
- Railway Node.js worker (`worker/index.ts`) — polls Supabase every 30s and runs the mint pipeline

**Smart contracts**
- Solidity 0.8.x, Hardhat, OpenZeppelin v5
- `contracts/src/PetSubnameRegistrar.sol` — single multi-parent ENS subname registrar

---

## Contracts

Mainnet (current):

| Contract | Address |
|---|---|
| `PetSubnameRegistrar` (v3) | [`0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1`](https://etherscan.io/address/0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1) |
| ENS `NameWrapper` | `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401` |

`dogid.eth` and `catid.eth` are both wrapped via `NameWrapper` and `setApprovalForAll` is granted to the registrar so it can issue subnames under either parent.

**Fuses:** Subnames are minted with `CANNOT_UNWRAP | PARENT_CANNOT_CONTROL` (the latter is `1 << 16`, **not** `1 << 17` — that's `IS_DOT_ETH` and the NameWrapper will reject it).

**`_mintSubname` pattern:** The contract temporarily sets `address(this)` as the subname owner so it can write the `contenthash` on the resolver, then `safeTransferFrom`s the wrapped NFT to the actual owner. This is why `PetSubnameRegistrar` inherits `ERC1155Holder` — without it the transfer reverts.

**Fee:** `0.00825 ETH`, set via `setFee()`.

<details>
<summary>Contract history</summary>

| Version | Address | Status |
|---|---|---|
| v1 | `0xB67E50524560a73C56E55B3Ae33f94D6541841A0` | Wrong fuse (`1 << 17` = `IS_DOT_ETH`), rejected by NameWrapper |
| v2 | `0x3b410a5cE72d3984625a367c0608dFD72C0C6B1b` | Fixed fuse, but missing `ERC1155Holder` → transfer reverted |
| v3 | `0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1` | **Current.** Both issues fixed, verified on Etherscan |

</details>

---

## Repository layout

```
petid-eth/
├── app/                       Next.js App Router
│   ├── page.tsx               landing
│   ├── register/              wizard (fiat + crypto flows)
│   ├── api/
│   │   ├── helio-webhook/     PAYMENT_SUCCESS handler (HMAC-SHA256)
│   │   └── create-checkout/   creates Helio pay link
│   ├── [subdomain]/           profile page route
│   ├── admin/                 ops dashboard
│   ├── privacy/, terms/, success/, found/
│   ├── layout.tsx, providers.tsx, globals.css
├── components/                shared UI
├── hooks/
│   └── useRegister.ts         wagmi mint hook (writeContractAsync)
├── lib/                       wagmi config, supabase client, IPFS helpers
├── contracts/
│   ├── src/PetSubnameRegistrar.sol
│   ├── scripts/, test/, deployments/
│   └── hardhat.config.cjs
├── worker/                    Railway mint worker
│   └── index.ts               photo → IPFS → HTML → IPFS → ENS → email
├── scripts/
│   ├── setup-registrar.mjs    approve registrar on NameWrapper
│   └── wrap-names.mjs         wrap dogid.eth / catid.eth
├── supabase/                  schema + migrations
├── public/, types/
├── next.config.ts, wrangler.toml
└── package.json
```

---

## Local development

```bash
# install
npm install

# dev server
npm run dev               # http://localhost:3000

# build for Cloudflare Pages
npm run pages:build

# deploy to Cloudflare Pages
npm run deploy            # builds + wrangler pages deploy
```

Contracts (separate workspace under `contracts/`):

```bash
cd contracts
npm install
npm run compile
npm run deploy:sepolia    # or deploy:mainnet
```

Worker (separate workspace under `worker/`, Railway-deployed):

```bash
cd worker
npm install
npm run dev
```

> The worker is split into its own folder so Railway's Next.js CVE scan doesn't trip on the parent project.

---

## Environment variables

Minimum set for the web app (`.env.local`):

```
# Public
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=9588ece98cf4d20f8b72ed925174849d
NEXT_PUBLIC_PETID_REGISTRAR_ADDRESS=0xfd428E9188c9D858D48Ca2fEE9199Cc2d66D61C1
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server
SUPABASE_SERVICE_ROLE_KEY=
PINATA_JWT=
HELIO_API_KEY=
HELIO_WEBHOOK_SECRET=
RESEND_API_KEY=
```

Worker additionally needs `MAINNET_RPC_URL` and `REGISTRAR_PRIVATE_KEY`.

---

## Gotchas worth knowing

- **CID version matters.** All Pinata uploads must use `cidVersion: 1` (`bafy…`). CIDv0 (`Qm…`) causes ENS `contenthash` resolution issues.
- **Contenthash encoding:** base32-decode the CID then prepend `0xe301` (IPFS multicodec).
- **Use `.link`, not `.limo`** for profile URLs. The QR codes encode `.link`.
- **`writeContractAsync`, not `writeContract`.** The wizard runs async IPFS uploads between the user click and the wallet popup; `writeContract` loses the gesture chain and the popup never appears.
- **Next.js 15 + Cloudflare Pages:** every dynamic route needs `export const runtime = 'edge'`.
- **AGENTS.md** in this repo warns that Next.js 15.5 has breaking changes from older training data — check `node_modules/next/dist/docs/` if anything feels off.

---

## Deployments

- **Live production:** [`petid.eth`](https://petid.eth.link) — served from IPFS, built from [`petid-eth-ipfs`](../petid-eth-ipfs)
- **This repo (paused):** Cloudflare Pages target — `https://main.petid-eth.pages.dev`. The fiat flow is on hold until a new payment merchant is wired in to replace Helio.
- **Worker:** Railway (root dir = `worker/`) — not currently running
- **Repo:** [`RWA-ID/pet-id`](https://github.com/RWA-ID/pet-id) (private)

---

## License

All rights reserved. Contact the maintainers for licensing inquiries.
