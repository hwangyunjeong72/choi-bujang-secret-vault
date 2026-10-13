// Only consume fields supplied by the stage-9 verified-event contract.
// No event copies, raw tokens, note bodies, names or logging are retained.
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  // Contract: { at, method, identity: { sub } }. Device ID and prior
  // decision are not supplied; do not fabricate these values.
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
    // Ignore any extra fields, including client-supplied identity metadata,
    // headers, note contents, and authorization strings.
  }
  return { action: 'observe' };
}
