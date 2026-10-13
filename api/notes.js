// 2단계: 공개 연습용 API. 인증은 이후 단계에서 구현합니다.
// SUPABASE_SECRET_KEY는 Vercel 서버 환경변수에서만 읽습니다.
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
    if (!upstream.ok) {
      return response.status(502).json({ error: 'NOTES_READ_FAILED' });
    }
    const rows = await upstream.json();
    if (!Array.isArray(rows)) {
      return response.status(502).json({ error: 'NOTES_READ_FAILED' });
    }
    return response.status(200).json({
      notes: rows.map(({ title, content }) => ({ title, content }))
    });
  } catch {
    // 서버 환경변수, 내부 URL 및 응답 본문을 오류 메시지에 포함하지 않습니다.
    return response.status(502).json({ error: 'NOTES_READ_FAILED' });
  }
}
