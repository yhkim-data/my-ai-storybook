// 엄격한 응답 모양 바꾸기 검사: additionalProperties:false 붙이기와 배열 길이 제한 빼기.
import { describe, expect, it } from 'vitest';
import { PLOTS_SCHEMA, build_pages_schema } from './prompts';
import { to_strict_schema } from './strict_schema';

/** 스키마 안의 모든 객체 마디를 모은다. */
function collect_objects(node: unknown, found: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) node.forEach((item) => collect_objects(item, found));
  else if (typeof node === 'object' && node !== null) {
    const record = node as Record<string, unknown>;
    if (record.type === 'object') found.push(record);
    Object.values(record).forEach((value) => collect_objects(value, found));
  }
  return found;
}

describe('to_strict_schema', () => {
  it('모든 객체에 additionalProperties:false 를 붙인다', () => {
    const result = to_strict_schema(build_pages_schema(4), true);
    const objects = collect_objects(result);
    expect(objects).toHaveLength(2);
    for (const item of objects) expect(item.additionalProperties).toBe(false);
  });

  it('keep_array_bounds가 true면 배열 길이를 남기고 false면 뺀다', () => {
    const kept = JSON.stringify(to_strict_schema(PLOTS_SCHEMA, true));
    expect(kept).toContain('minItems');
    expect(kept).toContain('maxItems');
    const dropped = JSON.stringify(to_strict_schema(PLOTS_SCHEMA, false));
    expect(dropped).not.toContain('minItems');
    expect(dropped).not.toContain('maxItems');
  });

  it('원본을 바꾸지 않는다', () => {
    const before = JSON.stringify(PLOTS_SCHEMA);
    to_strict_schema(PLOTS_SCHEMA, false);
    expect(JSON.stringify(PLOTS_SCHEMA)).toBe(before);
  });
});
