import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, parseHostMessage } from '../src/index.js';

describe('protocol scaffold', () => {
  it('scaffold: parses the host welcome and rejects malformed input', () => {
    const welcome = {
      type: 'host/welcome',
      protocolVersion: PROTOCOL_VERSION,
      hostVersion: '0.1.0',
      port: 3001,
    };
    expect(parseHostMessage(JSON.stringify(welcome))).toEqual(welcome);
    expect(parseHostMessage('not json')).toBeNull();
    expect(parseHostMessage('null')).toBeNull();
    expect(parseHostMessage(JSON.stringify({ ...welcome, port: '3001' }))).toBeNull();
    expect(parseHostMessage(JSON.stringify({ type: 'evil' }))).toBeNull();
  });
});
