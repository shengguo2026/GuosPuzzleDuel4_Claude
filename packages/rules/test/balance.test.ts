import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../balance.v1.schema.json' with { type: 'json' };
import { balance, hostPortRange } from '../src/index.js';

describe('balance.v1.json', () => {
  it('QA-01: validates against its JSON schema', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(balance);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it('OPS-02: the host port range is 3000 to 3019', () => {
    expect(hostPortRange).toEqual({ first: 3000, last: 3019 });
    expect(balance.ops.firstPort.status).toBe('LOCKED');
  });
});
