/**
 * Rules and balance data (PLAN.md section 3, implementation plan WP 0.2).
 * Every tunable number lives in balance.v1.json; code reads it from here and
 * never hides its own constants (implementation plan section 1, rule 3).
 */
import balanceJson from '../balance.v1.json' with { type: 'json' };

export type FieldStatus = 'LOCKED' | 'PROVISIONAL';

/** One tunable value with its provenance. */
export interface BalanceField<T> {
  value: T;
  status: FieldStatus;
  unit?: string;
  ref: string[];
}

export type Balance = typeof balanceJson;

export const balance: Balance = balanceJson;

/** Port range the host tries in order (D-25, OPS-02). */
export const hostPortRange = {
  first: balance.ops.firstPort.value,
  last: balance.ops.lastPort.value,
} as const;
