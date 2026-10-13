// Only use identity and registration verified by the ALEPH engine.
// The verified device must be registered to read notes. Other requests remain denied.
export const RULE_IDS = Object.freeze(['device_registered']);

// Validate only the engine contract. Never promote request headers or invented
// location/device objects into trusted connection signals.
const isRecord = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const hasOnly = (value, keys) => isRecord(value)
  && Object.keys(value).every(key => keys.includes(key));
const validSignals = signals => hasOnly(signals, ['source', 'region', 'network', 'hour'])
  && typeof signals.source === 'string'
  && ['none', 'judge_fixture'].includes(signals.source)
  && typeof signals.region === 'string'
  && typeof signals.network === 'string'
  && (signals.hour === null || (Number.isInteger(signals.hour)
    && signals.hour >= 0 && signals.hour <= 23))
  && (signals.source !== 'none'
    || (signals.region === 'unknown' && signals.network === 'unknown'));
const validRecentEvents = events => Array.isArray(events)
  && events.length <= 12 && events.every(event =>
    hasOnly(event, ['kind', 'ageSeconds', 'count'])
    && typeof event.kind === 'string' && event.kind.length > 0
    && Number.isInteger(event.ageSeconds) && event.ageSeconds >= 0
    && Number.isInteger(event.count) && event.count >= 0);
const trustedInputShape = request => isRecord(request)
  && request.schema === 'aleph.decision.v1'
  && !['identity', 'device', 'geo', 'role', 'headers'].some(key =>
    Object.hasOwn(request, key))
  && validSignals(request.signals)
  && validRecentEvents(request.recentEvents);

export async function decide(request) {
  const registered = request?.deviceRegistered === true;
  const readRoute = request?.method === 'GET'
    && (request?.route === 'GET /api/notes'
      || request?.route === 'GET /api/notes/:id'
      || request?.route === 'GET /notes'
      || request?.route === 'GET /notes/:id');
  // Invalid or unverified signal provenance fails closed. Fixture metadata
  // remains simulation-only and is never treated as real location proof.
  const inputValid = trustedInputShape(request);

  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: inputValid && registered && readRoute ? 'allow' : 'deny',
    reasonCode: !registered ? 'device_not_registered'
      : (!inputValid || !readRoute ? 'starter_not_ready' : 'approved'),
    ruleIds: ['device_registered'],
  };
}
