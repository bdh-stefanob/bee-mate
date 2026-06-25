/**
 * github-utils.ts — Shared GitHub REST API helpers.
 *
 * Security constraints (inherited from T-05-03-*):
 *   T-05-03-02: token never echoed in error messages (use sanitizeError)
 *   T-05-03-03: token always passed via headers, never in body
 *   T-05-03-04: owner/repo/branch validated with GITHUB_NAME_RE before URL interpolation
 */

/** Whitelist regex for GitHub owner/repo/branch names (T-05-03-04). */
export const GITHUB_NAME_RE = /^[a-zA-Z0-9_.\-]+$/;

/** Standard GitHub REST API request headers. */
export function ghHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/**
 * getFileSHA — returns the SHA of a file on a given branch.
 * Returns undefined if the file does not exist (404). Throws on other errors.
 */
export async function getFileSHA(
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
  token: string,
): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (res.ok) {
    return ((await res.json()) as { sha: string }).sha;
  }
  if (res.status === 404) return undefined;
  throw new Error(`GitHub GET failed: ${res.status}`);
}

/**
 * getFileContent — fetches the decoded UTF-8 content and SHA of a file.
 * Returns undefined if the file does not exist (404). Throws on other errors.
 */
export async function getFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
  token: string,
): Promise<{ content: string; sha: string } | undefined> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (res.ok) {
    const json = (await res.json()) as { content: string; sha: string };
    const content = Buffer.from(json.content, 'base64').toString('utf-8');
    return { content, sha: json.sha };
  }
  if (res.status === 404) return undefined;
  throw new Error(`GitHub GET failed: ${res.status}`);
}

/**
 * putContents — creates or updates a file on GitHub (PUT /contents).
 * Pass sha to update an existing file; omit it to create a new file.
 * Pass author to set the Git commit author identity (D-07).
 * Throws with the GitHub error message on failure.
 */
export async function putContents(
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
  token: string,
  content: string,
  sha: string | undefined,
  message: string,
  author?: { name: string; email: string },
): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  if (author) {
    body.author = author;
    body.committer = author;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) },
  );

  if (!res.ok) {
    throw new Error(
      ((await res.json()) as { message?: string }).message ??
        `GitHub PUT failed: ${res.status}`,
    );
  }
}

/**
 * branchEnsure — ensures a branch exists, auto-creating it from baseBranch if missing (D-02).
 * No-op if the branch already exists (GET returns 200).
 * On 404: fetches the baseBranch HEAD sha, then POSTs a new ref.
 * Throws on unexpected status codes.
 */
export async function branchEnsure(
  owner: string,
  repo: string,
  branch: string,
  baseBranch: string,
  token: string,
): Promise<void> {
  const checkUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const checkRes = await fetch(checkUrl, { headers: ghHeaders(token) });

  if (checkRes.ok) {
    // Branch already exists — nothing to do.
    return;
  }

  if (checkRes.status !== 404) {
    throw new Error(`GitHub GET failed: ${checkRes.status}`);
  }

  // Branch does not exist: get the base branch HEAD sha.
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`;
  const baseRes = await fetch(baseUrl, { headers: ghHeaders(token) });
  if (!baseRes.ok) {
    throw new Error(`GitHub GET base branch failed: ${baseRes.status}`);
  }
  const baseJson = (await baseRes.json()) as { object: { sha: string } };
  const baseSha = baseJson.object.sha;

  // Create the new branch.
  const createUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: ghHeaders(token),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  if (!createRes.ok) {
    const errJson = (await createRes.json()) as { message?: string };
    throw new Error(errJson.message ?? `GitHub POST refs failed: ${createRes.status}`);
  }
}

/**
 * sanitizeError — replaces all occurrences of the token in a message with '[TOKEN]'.
 * Matches T-05-03-02: prevents token leakage in error responses.
 */
export function sanitizeError(message: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return message.replace(new RegExp(escaped, 'g'), '[TOKEN]');
}
