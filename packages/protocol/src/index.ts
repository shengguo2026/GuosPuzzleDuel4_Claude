/**
 * Host <-> client messages (filled in from M3, WP 3.1). M1 defines only the
 * greeting the host sends when a browser opens the WebSocket, so the client
 * can show that the connection on the bound port works (OPS-02).
 */
export const PROTOCOL_VERSION = 1;

export interface HostWelcome {
  type: 'host/welcome';
  protocolVersion: number;
  hostVersion: string;
  port: number;
}

export type HostMessage = HostWelcome;

/** Parses a message from the host; returns null for anything unknown. */
export function parseHostMessage(raw: string): HostMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (
    msg.type === 'host/welcome' &&
    typeof msg.protocolVersion === 'number' &&
    typeof msg.hostVersion === 'string' &&
    typeof msg.port === 'number'
  ) {
    return {
      type: 'host/welcome',
      protocolVersion: msg.protocolVersion,
      hostVersion: msg.hostVersion,
      port: msg.port,
    };
  }
  return null;
}
