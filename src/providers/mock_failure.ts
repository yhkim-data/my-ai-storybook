// 가짜 연결부가 오류를 흉내 내게 하는 장치. 주소에 ?mockfail=quota|rate|blocked|network 를 붙이면
// 각 동작이 처음 한 번 실패하고, 다시 하면 성공한다. 자동 검사에서 쓴다.
import { ProviderError, type ProviderErrorKind } from './types';

/** 주소 꼬리표 이름 */
const FAIL_PARAM = 'mockfail';
/** 흉내 낸 분당 한도가 풀리는 시간(ms). 검사가 오래 걸리지 않게 짧게 둔다. */
const MOCK_RATE_WAIT_MS = 2000;
/** 흉내 낸 하루 한도가 풀리는 시간(ms) */
const MOCK_QUOTA_WAIT_MS = 3 * 60 * 60 * 1000;

/** 꼬리표 값과 오류 종류의 짝 */
const FAIL_KINDS: Record<string, ProviderErrorKind> = {
  quota: 'quota_daily',
  rate: 'rate',
  blocked: 'blocked',
  network: 'network',
};

/** 이미 한 번 실패한 동작 이름 */
const failed_operations = new Set<string>();

/**
 * 주소에서 흉내 낼 오류 종류를 읽는다. 없으면 null이다.
 */
function read_fail_kind(): ProviderErrorKind | null {
  if (typeof location === 'undefined') return null;
  const value = new URLSearchParams(location.search).get(FAIL_PARAM);
  return value ? (FAIL_KINDS[value] ?? null) : null;
}

/**
 * 흉내 낼 오류가 켜져 있고 이 동작이 아직 실패한 적 없으면 오류를 던진다.
 */
export function maybe_fail(operation: string): void {
  const kind = read_fail_kind();
  if (!kind || failed_operations.has(operation)) return;
  failed_operations.add(operation);
  if (kind === 'rate') throw new ProviderError(kind, Date.now() + MOCK_RATE_WAIT_MS);
  if (kind === 'quota_daily') throw new ProviderError(kind, Date.now() + MOCK_QUOTA_WAIT_MS);
  throw new ProviderError(kind);
}

/**
 * 실패 기록을 지운다. 단위 검사에서 쓴다.
 */
export function reset_mock_failures(): void {
  failed_operations.clear();
}
