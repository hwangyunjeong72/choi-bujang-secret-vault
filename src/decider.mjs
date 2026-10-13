// Only use identity and registration verified by the ALEPH engine.
// The verified device must be registered to read notes. Other requests remain denied.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

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

// Resource zoning uses only engine-verified service, method, route and path.
// Exact segment boundaries keep /export from being treated as a note ID.
const routeZone = request => {
  if (typeof request?.service !== 'string' || typeof request?.method !== 'string'
      || typeof request?.route !== 'string' || typeof request?.path !== 'string') return null;
  const method = request.method;
  const route = request.route;
  const path = request.path;
  if (method === 'GET' && request.service === 'notes'
      && (route === 'GET /api/notes/:id' || route === 'GET /notes/:id')) {
    const prefix = route.includes('/api/') ? '/api/notes/' : '/notes/';
    const id = path.startsWith(prefix) ? path.slice(prefix.length) : '';
    if (id && !id.includes('/') && id !== 'export' && !id.startsWith(':')
        && !/[?#]/u.test(id)) return 'personal_notes';
  }
  if (method === 'GET' && request.service === 'notices'
      && (route === 'GET /api/notices' || route === 'GET /notices')
      && (path === '/api/notices' || path === '/notices')
      && route.endsWith(path)) return 'class_notices';
  return null; // Instructor-only documents, mutations, lists and unknown paths.
};

// Only the combination of unusual hour, unfamiliar network and a recent
// burst of reading is a step-up signal; geography alone never blocks access.
const requiresStepUp = request => {
  if (request.signals?.source !== 'judge_fixture') return false;
  const unusualHour = Number.isInteger(request.signals.hour)
    && (request.signals.hour < 6 || request.signals.hour >= 23);
  const unfamiliarNetwork = request.signals.network === 'unusual';
  const readingBurst = request.recentEvents.some(event =>
    event.kind === 'risk_signal' && event.ageSeconds <= 300 && event.count >= 10);
  return unusualHour && unfamiliarNetwork && readingBurst;
};

export async function decide(request) {
  const registered = request?.deviceRegistered === true;
  const zone = routeZone(request);
  const inputValid = trustedInputShape(request);
  const eligible = registered && inputValid && zone !== null;
  const suspicious = eligible && requiresStepUp(request);
  // A verified, fresh step-up is provided by the engine, not client headers.
  const freshlyVerified = request?.stepUp?.verified === true
    && Number.isInteger(request.stepUp.authAgeSeconds)
    && request.stepUp.authAgeSeconds >= 0
    && request.stepUp.authAgeSeconds <= 300;
  const needsConfirmation = suspicious && !freshlyVerified;

  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: !eligible ? 'deny' : needsConfirmation ? 'step_up' : 'allow',
    reasonCode: !registered ? 'device_not_registered'
      : !eligible ? 'starter_not_ready'
      : needsConfirmation ? 'step_up_required' : 'approved',
    ruleIds: needsConfirmation ? ['device_registered', 'step_up_required']
      : ['device_registered'],
  };
}
