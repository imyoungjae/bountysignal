const token = process.env.BOUNTYSIGNAL_ADMIN_TOKEN;
const publicRepo = process.env.PUBLIC_REPO ?? "imyoungjae/bountysignal";
const privateRepo = process.env.PRIVATE_REPO ?? "imyoungjae/bountysignal-pro";
const owner = privateRepo.split("/")[0].toLowerCase();

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
    headers,
  });
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} ${path}: ${await response.text()}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function field(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`### ${escaped}\\s*\\n+([^\\n]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

async function list(path) {
  const collected = [];
  for (let page = 1; page <= 10; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const items = await github(`${path}${separator}per_page=100&page=${page}`);
    collected.push(...items);
    if (items.length < 100) break;
  }
  return collected;
}

const issues = await list(
  `/repos/${publicRepo}/issues?state=closed&labels=activated`,
);
const latestExpiry = new Map();

for (const issue of issues) {
  const username = field(issue.body ?? "", "GitHub username")
    .replace(/^@/, "")
    .toLowerCase();
  if (!username || !issue.closed_at) continue;
  const expiry = new Date(issue.closed_at).getTime() + 30 * 24 * 60 * 60 * 1000;
  latestExpiry.set(
    username,
    Math.max(expiry, latestExpiry.get(username) ?? 0),
  );
}

const collaborators = await list(`/repos/${privateRepo}/collaborators`);
let removed = 0;
for (const collaborator of collaborators) {
  const username = collaborator.login.toLowerCase();
  if (username === owner) continue;
  const expiry = latestExpiry.get(username);
  if (!expiry || Date.now() <= expiry) continue;
  await github(
    `/repos/${privateRepo}/collaborators/${encodeURIComponent(collaborator.login)}`,
    {method: "DELETE"},
  );
  removed += 1;
}

console.log(JSON.stringify({subscriptions: latestExpiry.size, removed}));
