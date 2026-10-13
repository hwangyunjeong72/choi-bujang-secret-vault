import { readFileSync } from 'node:fs';
import { createLoginVerifier } from '../src/verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
let verifier;
function getVerifier(secretKey) {
  verifier ??= createLoginVerifier({ config, supabaseSecretKey: secretKey });
  return verifier;
}

// 3단계: 요청자의 검증된 토큰이 없으면 자료를 반환하지 않습니다.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return response.status(503).json({ error: 'NOTES_SERVER_NOT_CONFIGURED' });
  }

  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'LOGIN_REQUIRED' });
  }
  let verified;
  try {
    verified = await getVerifier(secretKey)(authorization);
  } catch {
    return response.status(503).json({ error: 'LOGIN_VERIFICATION_UNAVAILABLE' });
  }
  if (!verified) {
    return response.status(401).json({ error: 'INVALID_LOGIN' });
  }

  try {
    const project = new URL(url);
    if (project.protocol !== 'https:' || project.username || project.password) {
      return response.status(503).json({ error: 'NOTES_SERVER_NOT_CONFIGURED' });
    }
    const endpoint = new URL('/rest/v1/learning_notes', project);
    endpoint.searchParams.set('select', 'title,content');
    endpoint.searchParams.set('order', 'created_at.asc');
    endpoint.searchParams.set('limit', '4');

    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: { apikey: secretKey, Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!upstream.ok) return response.status(502).json({ error: 'NOTES_READ_FAILED' });
    const rows = await upstream.json();
    if (!Array.isArray(rows)) return response.status(502).json({ error: 'NOTES_READ_FAILED' });
    return response.status(200).json({
      notes: rows.map(({ title, content }) => ({ title, content }))
    });
  } catch {
    return response.status(502).json({ error: 'NOTES_READ_FAILED' });
  }
}
