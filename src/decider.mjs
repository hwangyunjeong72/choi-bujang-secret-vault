// Only use identity and registration verified by the ALEPH engine.
// The verified device must be registered to read notes. Other requests remain denied.
export const RULE_IDS = Object.freeze(['device_registered']);

export async function decide(request) {
  const registered = request?.deviceRegistered === true;
  const readRoute = request?.method === 'GET'
    && (request?.route === 'GET /api/notes'
      || request?.route === 'GET /api/notes/:id'
      || request?.route === 'GET /notes'
      || request?.route === 'GET /notes/:id');

  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: registered && readRoute ? 'allow' : 'deny',
    reasonCode: registered
      ? (readRoute ? 'approved' : 'starter_not_ready')
      : 'device_not_registered',
    ruleIds: ['device_registered'],
  };
}
