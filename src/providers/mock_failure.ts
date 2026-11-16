// Lets the mock providers simulate errors for automated tests. With ?mockfail=quota|rate|blocked|network
// in the URL, each operation fails once and succeeds on the next try.
import { ProviderError, type ProviderErrorKind } from './types';

const FAIL_PARAM = 'mockfail';
/** Simulated rate-limit wait in ms, kept short so tests stay fast. */
const MOCK_RATE_WAIT_MS = 2000;
/** Simulated daily quota reset wait in ms. */
const MOCK_QUOTA_WAIT_MS = 3 * 60 * 60 * 1000;

const FAIL_KINDS: Record<string, ProviderErrorKind> = {
  quota: 'quota_daily',
  rate: 'rate',
  blocked: 'blocked',
  network: 'network',
};

/** Operations that have already failed once. */
const failed_operations = new Set<string>();

function read_fail_kind(): ProviderErrorKind | null {
  if (typeof location === 'undefined') return null;
  const value = new URLSearchParams(location.search).get(FAIL_PARAM);
  return value ? (FAIL_KINDS[value] ?? null) : null;
}

/**
 * Throws if a simulated error is on and this operation has not failed yet.
 */
export function maybe_fail(operation: string): void {
  const kind = read_fail_kind();
  if (!kind || failed_operations.has(operation)) return;
  failed_operations.add(operation);
  if (kind === 'rate') throw new ProviderError(kind, Date.now() + MOCK_RATE_WAIT_MS);
  if (kind === 'quota_daily') throw new ProviderError(kind, Date.now() + MOCK_QUOTA_WAIT_MS);
  throw new ProviderError(kind);
}

/** Clears the failure record. Used by unit tests. */
export function reset_mock_failures(): void {
  failed_operations.clear();
}
