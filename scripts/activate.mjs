const token = process.env.BOUNTYSIGNAL_ADMIN_TOKEN;
const publicRepo = process.env.PUBLIC_REPO ?? "imyoungjae/bountysignal";
const privateRepo = process.env.PRIVATE_REPO ?? "imyoungjae/bountysignal-pro";
const rpcUrl = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const issueNumber = process.env.ISSUE_NUMBER;

const usdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const wallet = "0x77797f896dc65d779a25aa924d160763ee89c662";
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const expectedAmount = 29_000_000n;

if (!token) {
  throw new Error("BOUNTYSIGNAL_ADMIN_TOKEN is required.");
}

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "User-Agent": "BountySignal-Access/1.0",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {...headers, ...(init.headers ?? {})},
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub ${response.status} ${path}: ${detail}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params}),
  });
  if (!response.ok) {
    throw new Error(`Base RPC failed with ${response.status}.`);
  }
  const payload = await response.json();
  if (payload.error) {
    throw new Error(`Base RPC: ${payload.error.message}`);
  }
  return payload.result;
}

function field(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`### ${escaped}\\s*\\n+([^\\n]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function normalizedUsername(body) {
  return field(body, "GitHub username").replace(/^@/, "");
}

function transactionHash(body) {
  return field(body, "Base transaction hash").toLowerCase();
}

function labels(issue) {
  return issue.labels.map((label) =>
    typeof label === "string" ? label : label.name,
  );
}

async function addLabel(number, label) {
  await github(`/repos/${publicRepo}/issues/${number}/labels`, {
    method: "POST",
    body: JSON.stringify({labels: [label]}),
  });
}

async function removeLabel(number, label) {
  const response = await fetch(
    `https://api.github.com/repos/${publicRepo}/issues/${number}/labels/${encodeURIComponent(label)}`,
    {method: "DELETE", headers},
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`Unable to remove label ${label}: ${response.status}`);
  }
}

async function comment(number, body) {
  await github(`/repos/${publicRepo}/issues/${number}/comments`, {
    method: "POST",
    body: JSON.stringify({body}),
  });
}

async function listIssues(state, label) {
  const collected = [];
  for (let page = 1; page <= 10; page += 1) {
    const items = await github(
      `/repos/${publicRepo}/issues?state=${state}&labels=${encodeURIComponent(label)}&per_page=100&page=${page}`,
    );
    collected.push(...items.filter((item) => !item.pull_request));
    if (items.length < 100) break;
  }
  return collected;
}

async function alreadyUsed(hash, currentNumber) {
  const activated = await listIssues("all", "activated");
  return activated.some(
    (issue) =>
      issue.number !== currentNumber &&
      transactionHash(issue.body ?? "") === hash,
  );
}

async function verifyPayment(hash) {
  const [receipt, latestHex] = await Promise.all([
    rpc("eth_getTransactionReceipt", [hash]),
    rpc("eth_blockNumber", []),
  ]);
  if (!receipt || receipt.status !== "0x1") {
    return {valid: false, reason: "The transaction is not confirmed yet."};
  }

  const recipientTopic = `0x${wallet.slice(2).padStart(64, "0")}`;
  const transfer = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === usdc &&
      log.topics?.[0]?.toLowerCase() === transferTopic &&
      log.topics?.[2]?.toLowerCase() === recipientTopic &&
      BigInt(log.data) === expectedAmount,
  );
  if (!transfer) {
    return {
      valid: false,
      reason: "No exact 29 USDC transfer to the published address was found.",
    };
  }

  const confirmations =
    Number(BigInt(latestHex) - BigInt(receipt.blockNumber)) + 1;
  if (confirmations < 2) {
    return {valid: false, reason: "Waiting for a second Base confirmation."};
  }
  return {valid: true, confirmations};
}

async function processIssue(issue) {
  if (issue.state !== "open" || labels(issue).includes("activated")) return;

  const username = normalizedUsername(issue.body ?? "");
  const hash = transactionHash(issue.body ?? "");
  if (
    !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) ||
    !/^0x[a-f\d]{64}$/i.test(hash)
  ) {
    await addLabel(issue.number, "needs-payment-review");
    return;
  }

  if (await alreadyUsed(hash, issue.number)) {
    await comment(
      issue.number,
      "This transaction hash has already activated another subscription.",
    );
    await addLabel(issue.number, "needs-payment-review");
    return;
  }

  const verification = await verifyPayment(hash);
  if (!verification.valid) {
    await addLabel(issue.number, "needs-payment-review");
    return;
  }

  await github(`/users/${encodeURIComponent(username)}`);
  await github(
    `/repos/${privateRepo}/collaborators/${encodeURIComponent(username)}`,
    {
      method: "PUT",
      body: JSON.stringify({permission: "pull"}),
    },
  );
  await addLabel(issue.number, "activated");
  await removeLabel(issue.number, "needs-payment-review");
  await comment(
    issue.number,
    [
      `Payment verified with ${verification.confirmations} Base confirmations.`,
      "",
      `@${username}, GitHub has sent your invitation to the private BountySignal Pro feed. Access runs for 30 days from this activation.`,
    ].join("\n"),
  );
  await github(`/repos/${publicRepo}/issues/${issue.number}`, {
    method: "PATCH",
    body: JSON.stringify({state: "closed", state_reason: "completed"}),
  });
}

const issues = issueNumber
  ? [await github(`/repos/${publicRepo}/issues/${issueNumber}`)]
  : await listIssues("open", "activation");

for (const issue of issues) {
  await processIssue(issue);
}

console.log(JSON.stringify({checked: issues.length}));
