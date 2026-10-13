import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createLoginVerifier } from '../src/verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let verifier;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Allow', 'GET, POST, PUT, DELETE');

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method))
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return res.status(503).json({ error: 'NOTES_SERVER_NOT_CONFIGURED' });

  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'LOGIN_REQUIRED' });

  let identity;
  try {
    verifier ??= createLoginVerifier({ config, supabaseSecretKey: secret });
    identity = await verifier(auth);
  } catch {
    return res.status(503).json({ error: 'LOGIN_VERIFICATION_UNAVAILABLE' });
  }
  if (!identity) return res.status(401).json({ error: 'INVALID_LOGIN' });
  // Only verified userId is accepted; client-supplied userId/role are ignored.

  const segments = new URL(req.url, 'https://local.invalid').pathname.split('/').filter(Boolean);
  if (segments[0] !== 'api' || segments[1] !== 'notes' || segments.length > 3)
    return res.status(404).json({ error: 'NOT_FOUND' });
  const itemId = segments[2] || null;
  if (itemId && !UUID.test(itemId)) return res.status(400).json({ error: 'INVALID_ID' });
  if (!itemId && ['PUT', 'DELETE'].includes(req.method))
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (itemId && req.method === 'POST')
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  let payload;
  if (['POST', 'PUT'].includes(req.method)) {
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch { return res.status(400).json({ error: 'INVALID_JSON' }); }
    if (!payload || Array.isArray(payload) || typeof payload !== 'object'
        || typeof payload.title !== 'string' || !payload.title.trim()
        || payload.title.length > 200 || typeof payload.body !== 'string'
        || payload.body.length > 10000)
      return res.status(400).json({ error: 'INVALID_NOTE' });
    // Never allow client-supplied ownership metadata, even when it matches.
    if (Object.hasOwn(payload, 'owner_id') || Object.hasOwn(payload, 'ownerId')
        || Object.hasOwn(payload, 'userId') || Object.hasOwn(payload, 'role'))
      return res.status(403).json({ error: 'OWNER_CHANGE_FORBIDDEN' });
    if (itemId && Object.hasOwn(payload, 'id'))
      return res.status(400).json({ error: 'INVALID_UPDATE_FIELDS' });
    if (payload.id !== undefined && !UUID.test(String(payload.id)))
      return res.status(400).json({ error: 'INVALID_ID' });
  }

  try {
    const project = new URL(url);
    if (project.protocol !== 'https:' || project.username || project.password)
      return res.status(503).json({ error: 'NOTES_SERVER_NOT_CONFIGURED' });
    const endpoint = new URL('/rest/v1/learning_notes', project);
    const headers = { apikey: secret, Accept: 'application/json', 'Content-Type': 'application/json' };
    const mapNote = row => ({ id: row.id, title: row.title, body: row.content });
    let method = req.method;
    let body;
    if (itemId) endpoint.searchParams.set('id', 'eq.' + itemId);
    // Bind every item operation to the trusted identity, including GET/PATCH/DELETE.
    // The database enforces both predicates within the same statement.
    endpoint.searchParams.set('owner_id', 'eq.' + identity.userId);

    if (method === 'GET') {
      endpoint.searchParams.set('select', 'id,title,content');
      if (!itemId) endpoint.searchParams.set('order', 'created_at.asc');
    } else if (method === 'POST') {
      const id = payload.id || randomUUID();
      body = JSON.stringify({ id, title: payload.title.trim(), content: payload.body, owner_id: identity.userId });
      headers.Prefer = 'return=representation';
      endpoint.searchParams.set('select', 'id,title,content');
    } else if (method === 'PUT') {
      method = 'PATCH';
      // No owner_id can be changed: the new row retains the authenticated owner.
      body = JSON.stringify({ title: payload.title.trim(), content: payload.body });
      headers.Prefer = 'return=representation';
      endpoint.searchParams.set('select', 'id,title,content');
      // Existing row must belong to the authenticated user; only title/content change.
    } else {
      headers.Prefer = 'return=representation';
      endpoint.searchParams.set('select', 'id');
      // Deletion must match both ID and the authenticated owner.
    }

    const upstream = await fetch(endpoint, { method, headers, body, cache: 'no-store' });
    if (!upstream.ok) return res.status(502).json({ error: 'NOTES_STORAGE_FAILED' });
    const rows = await upstream.json();
    if (!Array.isArray(rows)) return res.status(502).json({ error: 'NOTES_STORAGE_FAILED' });
    if (req.method === 'GET') {
      if (!itemId) return res.status(200).json({ notes: rows.map(mapNote) });
      return rows.length ? res.status(200).json(mapNote(rows[0])) : res.status(404).json({ error: 'NOT_FOUND' });
    }
    if (req.method === 'POST') return rows.length ? res.status(201).json({ id: rows[0].id }) : res.status(502).json({ error: 'NOTES_STORAGE_FAILED' });
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    if (req.method === 'PUT') return res.status(200).json(mapNote(rows[0]));
    return res.status(200).json({ deleted: true });
  } catch {
    return res.status(502).json({ error: 'NOTES_STORAGE_FAILED' });
  }
}
