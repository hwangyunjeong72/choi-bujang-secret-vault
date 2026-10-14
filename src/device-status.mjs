// Fail-closed device status. Only a server-side trusted registry may attest registration.
// Never use client flags, localStorage, cookies or an install event as proof.
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const DEVICE_ID = /^[a-f0-9]{16}$/;
export function deviceStatus(identity, env = process.env) {
  if (!identity || !UUID.test(identity.userId || '')) return { registered: false, reason: 'invalid_identity' };
  // No real device-registration protocol/attestation is wired up yet.
  // Even a matching identity in a registry cannot identify the requesting device.
  return { registered: false, reason: 'device_attestation_not_configured' };
}
