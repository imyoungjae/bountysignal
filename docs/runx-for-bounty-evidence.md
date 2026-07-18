# Using runx to package bounty delivery evidence

A good bounty submission lets a reviewer answer three questions quickly:

1. What was authorized?
2. What actually ran?
3. Which public artifacts prove the result?

[runx](https://runx.ai) is useful here because a skill declares its inputs,
authority, tools, credential needs, and completion evidence before the runtime
executes it. The runtime then seals the outcome in a receipt. Its source and
architecture are public in the [runxhq/runx repository](https://github.com/runxhq/runx).

This is an operator pattern for developers using BountySignal; BountySignal
does not claim that installing runx guarantees a bounty will be accepted.
Acceptance still depends on the payer's stated criteria.

## 1. Pin and identify the runtime

Use a pinned version so a reviewer can reproduce the same command surface.
On 2026-07-18, the following checks returned `0.7.1` and
`runx-cli 0.7.1`:

```bash
npm view @runxhq/cli version
npx -y @runxhq/cli@0.7.1 --version
```

The matching upstream release is
[`cli-v0.7.1`](https://github.com/runxhq/runx/releases/tag/cli-v0.7.1).

## 2. Put the work behind a declared skill

The runx CLI can scaffold a native skill:

```bash
npx -y @runxhq/cli@0.7.1 new bounty-evidence
```

Keep the review contract in the generated package:

- `SKILL.md` explains the task and required output.
- `X.yaml` declares the execution profile, tools, environment, network intent,
  and writable paths.
- The runner produces deterministic artifact paths and exits non-zero when an
  acceptance check fails.

Do not place API keys in either public file. Configure declared credentials
through `runx credential ... --from-stdin` or the documented environment
resolution path.

## 3. Execute into an isolated receipt directory

Set an explicit directory so the receipt bundle is easy to retain with the
delivery:

```bash
export RUNX_RECEIPT_DIR="$PWD/.runx-bounty-receipts"
npx -y @runxhq/cli@0.7.1 skill ./bounty-evidence \
  --non-interactive \
  --json
```

The exact skill inputs depend on the bounty. Preserve the JSON output, the
produced artifacts, the pinned source commit, and the receipt file together.

One important limitation from the current runx reference: local CLI sandboxing
is described as `declared-policy-only`. Admission, working-directory rules,
environment shaping, and receipt metadata are applied, but local filesystem and
network isolation are not yet enforced with OS primitives. Do not describe a
local receipt as proof of OS-level isolation.

## 4. Verify before publishing

Use history to inspect the stored receipt:

```bash
npx -y @runxhq/cli@0.7.1 history
npx -y @runxhq/cli@0.7.1 history <receipt-id> --json
```

The official reference says history reports a receipt as `verified`,
`unverified`, or `invalid`. Treat anything other than `verified` as a blocker
for claims that require verified execution.

When the bounty requires a stranger-reachable receipt, publish the sealed
receipt through the hosted notary:

```bash
npx -y @runxhq/cli@0.7.1 publish \
  ./.runx-bounty-receipts/<receipt-id>.json
```

Publishing requires the documented hosted API authentication. Never commit that
token or a provider credential.

## 5. Give the reviewer a small, durable packet

A practical delivery packet contains:

- `public_url`: the human-facing result or upstream contribution.
- `source_url`: a commit-pinned source snapshot.
- `evidence_json`: machine-readable observations and acceptance checks.
- `receipt_ref`: the public receipt or notary reference when required.
- `report`: a short explanation of what changed, what was verified, and what
  remains uncertain.

Use immutable commit URLs for evidence and report files. Keep the public result
human-readable; do not point `public_url` at the evidence JSON itself.

The value of runx in this workflow is not a decorative badge. It is the
separation between authored instructions, admitted authority, executed work,
and a receipt a reviewer can verify.
