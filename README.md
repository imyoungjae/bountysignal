# BountySignal

Paid issues, before the crowd.

BountySignal checks the source issue—not just the marketplace card—before
surfacing paid developer work. It labels competition, reward state, and payout
rail so developers can reject stale work before spending hours on it.

## Live product

Visit [BountySignal](https://fortyeight-rescue.jaeber2se.chatgpt.site) for the free radar
and current Pro terms.

## Agent-payable APIs

BountySignal publishes an [OpenAPI contract](https://fortyeight-rescue.jaeber2se.chatgpt.site/openapi.json),
an [x402 discovery manifest](https://fortyeight-rescue.jaeber2se.chatgpt.site/.well-known/x402),
and an [agent card](https://fortyeight-rescue.jaeber2se.chatgpt.site/.well-known/agent.json).
Payments settle directly to the declared merchant wallet in USDC.

### Opportunity radar

The radar returns ranked, source-linked public software bounties. It costs
**0.05 USDC per call** and is available on Polygon and Base:

- `POST /api/opportunities/x402`
- `POST /api/opportunities/x402/base`

### Bounty due-diligence brief

The brief analyzes one public GitHub bounty issue and returns current source
state, stated reward evidence, observed payout rails, competition and linked-PR
signals, extracted scope, a deterministic pursue/verify/skip score, pre-work
questions, an execution plan, a ready-to-post claim draft, and a SHA-256
checksum. It costs **5.00 USDC per brief**:

- Free validation: `GET /api/brief/preflight?issue_url=<encoded URL>`
- Polygon: `POST /api/brief/x402`
- Base: `POST /api/brief/x402/base`

The paid request body requires `issue_url` and accepts optional `skills` and
`max_hours`. Run preflight first so invalid, unavailable, or excluded work is
rejected before payment. Security, vulnerability, smart-contract, and offensive
work is excluded from both products.

## Pro activation

BountySignal Pro costs **29 USDC on Base for 30 days**.

1. Send exactly 29 native USDC on Base to:
   `0x77797F896DC65D779a25aa924d160763EE89c662`
2. [Open an activation issue](https://github.com/imyoungjae/bountysignal/issues/new?template=activate.yml).
3. Include the public transaction hash and the GitHub username that should
   receive private-feed access. The payment is checked automatically and a
   private-repository invitation normally arrives within 15 minutes.

Never post a seed phrase, private key, email address, home address, or other
private information in an issue.

## What Pro includes

- Five-minute scans of supported sources
- GitHub issue alerts for newly verified work
- Rewarded, withdrawn, and payment-pending listings suppressed
- Competition and payout-rail notes
- 30 days of access per payment; no automatic renewal

Read [TERMS.md](TERMS.md) before paying.

## Delivery evidence

Winning a paid issue still requires reviewable proof. The
[runx guide](docs/runx-for-bounty-evidence.md) explains one reproducible way to
package a governed run, inspect its receipt, and give a bounty reviewer durable
evidence links.
