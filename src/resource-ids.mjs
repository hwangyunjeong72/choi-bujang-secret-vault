// Stable, server-owned resource identifiers for stage 8.
// These labels distinguish resource types; they do not grant access.
export const RESOURCE_IDS = Object.freeze({
  personalNotes: 'personal_notes',
  instructorNotices: 'instructor_notices',
});

// Determine resource type from the verified server-side method and route.
// Never accept a caller-supplied resource ID or role as authorization.
export function resourceIdForRequest(method, route) {
  if (typeof method !== 'string' || typeof route !== 'string') return null;
  if (method === 'GET' && (
    route === 'GET /api/notes' || route === 'GET /api/notes/:id'
    || route === 'GET /notes' || route === 'GET /notes/:id'
  )) return RESOURCE_IDS.personalNotes;
  if (['POST', 'PUT', 'DELETE'].includes(method) && (
    route === `${method} /api/notes` || route === `${method} /api/notes/:id`
    || route === `${method} /notes` || route === `${method} /notes/:id`
  )) return RESOURCE_IDS.personalNotes;
  // Reserved logical identifier only; no instructor notice route exists yet.
  return null;
}
