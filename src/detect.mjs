// Detect a verified synthetic burst without using client-supplied metadata.
// The current event contract has no network or location fields. Never infer
// an unfamiliar network, log tokens, or include note bodies in a proposal.
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const TEN_MINUTES = 10 * 60 * 1000;
const BURST_LIMIT = 120;

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');
  const readsBySubject = new Map();

  for (const event of events) {
    if (!isRecord(event) || !isRecord(event.identity)
      || typeof event.identity.sub !== 'string'
      || !/^[a-z0-9_-]{1,100}$/i.test(event.identity.sub)
      || typeof event.method !== 'string'
      || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)
      || typeof event.at !== 'string'
      || !Number.isFinite(Date.parse(event.at))) {
      throw new TypeError('invalid_detection_event');
    }
    if (event.method !== 'GET') continue;
    const sub = event.identity.sub;
    if (!readsBySubject.has(sub)) readsBySubject.set(sub, []);
    readsBySubject.get(sub).push(Date.parse(event.at));
  }

  // Stage-9 fixture contract: more than 120 reads by the same verified
  // pseudonymous subject inside any moving 10-minute window. No network
  // provenance is available; this proposal means burst_read only.
  for (const [subject, times] of readsBySubject) {
    times.sort((a, b) => a - b);
    let start = 0;
    for (let end = 0; end < times.length; end++) {
      while (times[end] - times[start] > TEN_MINUTES) start++;
      if (end - start + 1 > BURST_LIMIT) {
        return { action: 'propose_revocation', reasonCode: 'burst_read', subject };
      }
    }
  }
  return { action: 'observe' };
}
