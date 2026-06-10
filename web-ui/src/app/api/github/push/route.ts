import { NextResponse } from 'next/server';

interface PushBody {
  content: string;
  filePath: string;
}

/**
 * POST /api/github/push
 *
 * Crea o aggiorna un file .feature sul repo GitHub via REST API.
 *
 * Headers richiesti (token mai nel body — T-05-03-03):
 *   x-github-token  : GitHub Personal Access Token (PAT)
 *   x-github-owner  : owner del repo (user o org)
 *   x-github-repo   : nome del repo
 *   x-github-branch : branch target (default: "main")
 *
 * Body JSON:
 *   { content: string, filePath: string }
 *
 * Threat mitigations:
 *   T-05-03-01: filePath validato con whitelist regex + blocco path traversal ".."
 *   T-05-03-02: token rimosso dal messaggio di errore con replace
 *   T-05-03-03: token letto esclusivamente dall'header, mai dal body
 */
export async function POST(request: Request) {
  // 1. Leggere i token dagli header (mai dal body)
  const githubToken  = request.headers.get('x-github-token');
  const githubOwner  = request.headers.get('x-github-owner');
  const githubRepo   = request.headers.get('x-github-repo');
  const githubBranch = request.headers.get('x-github-branch') ?? 'main';

  if (!githubToken || !githubOwner || !githubRepo) {
    return NextResponse.json(
      { ok: false, error: 'Missing required headers: x-github-token, x-github-owner, x-github-repo' },
      { status: 400 }
    );
  }

  // Path injection guard: owner e repo devono contenere solo caratteri GitHub-valid (T-05-03-04)
  const GITHUB_NAME_RE = /^[a-zA-Z0-9_.\-]+$/;
  if (!GITHUB_NAME_RE.test(githubOwner) || !GITHUB_NAME_RE.test(githubRepo)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid x-github-owner or x-github-repo: only alphanumerics, hyphens, dots, underscores allowed' },
      { status: 400 }
    );
  }

  // 2. Leggere il body
  let body: PushBody;
  try {
    body = await request.json() as PushBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content, filePath } = body;
  if (!content || !filePath) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: content, filePath' },
      { status: 400 }
    );
  }

  // 3. Validare filePath (T-05-03-01): whitelist regex + blocco path traversal
  // Accetta: alfanumerici, /, ., -, _ — blocca: .., spazi, caratteri speciali
  if (!/^[\w./-]+$/.test(filePath) || filePath.includes('..')) {
    return NextResponse.json(
      { ok: false, error: 'Invalid filePath' },
      { status: 400 }
    );
  }

  const apiBase = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
  const authHeader = `token ${githubToken}`;
  const ghHeaders = {
    'Authorization': authHeader,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  try {
    // 4. Leggere il SHA se il file esiste già (GET)
    let sha: string | undefined;
    const getRes = await fetch(`${apiBase}?ref=${githubBranch}`, {
      headers: ghHeaders,
    });
    if (getRes.ok) {
      const existing = await getRes.json() as { sha: string };
      sha = existing.sha;
    } else if (getRes.status !== 404) {
      // 404 = file non esiste ancora (OK), altri errori = problema reale
      const errData = await getRes.json() as { message?: string };
      throw new Error(errData.message ?? `GitHub GET failed: ${getRes.status}`);
    }

    // 5. Codificare il contenuto in base64 con supporto Unicode (Buffer.from UTF-8)
    const base64Content = Buffer.from(content, 'utf-8').toString('base64');

    // 6. PUT per creare o aggiornare il file
    const putBody: Record<string, string> = {
      message: `feat: update ${filePath} via BDD web editor`,
      content: base64Content,
      branch: githubBranch,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errData = await putRes.json() as { message?: string };
      throw new Error(errData.message ?? `GitHub PUT failed: ${putRes.status}`);
    }

    return NextResponse.json({ ok: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // T-05-03-02: rimuovere il token dal messaggio di errore prima di restituirlo al client
    // Usare RegExp globale per sostituire TUTTE le occorrenze (plain .replace rimuove solo la prima)
    const escapedToken = githubToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeMessage = message.replace(new RegExp(escapedToken, 'g'), '[TOKEN]');
    return NextResponse.json({ ok: false, error: safeMessage }, { status: 500 });
  }
}
