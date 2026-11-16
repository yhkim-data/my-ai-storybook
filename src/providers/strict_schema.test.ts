// Strict schema tests: adding additionalProperties:false and dropping array length limits.
import { describe, expect, it } from 'vitest';
import { PLOTS_SCHEMA, build_pages_schema } from './prompts';
import { to_strict_schema } from './strict_schema';

/** Collects every object node in a schema. */
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
  it('adds additionalProperties:false to every object', () => {
    const result = to_strict_schema(build_pages_schema(4), true);
    const objects = collect_objects(result);
    expect(objects).toHaveLength(2);
    for (const item of objects) expect(item.additionalProperties).toBe(false);
  });

  it('keeps array bounds when keep_array_bounds is true and drops them when false', () => {
    const kept = JSON.stringify(to_strict_schema(PLOTS_SCHEMA, true));
    expect(kept).toContain('minItems');
    expect(kept).toContain('maxItems');
    const dropped = JSON.stringify(to_strict_schema(PLOTS_SCHEMA, false));
    expect(dropped).not.toContain('minItems');
    expect(dropped).not.toContain('maxItems');
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(PLOTS_SCHEMA);
    to_strict_schema(PLOTS_SCHEMA, false);
    expect(JSON.stringify(PLOTS_SCHEMA)).toBe(before);
  });
});
