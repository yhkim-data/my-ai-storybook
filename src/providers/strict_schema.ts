// 응답 JSON 모양(스키마)을 회사별 "엄격한 형식" 규칙에 맞게 바꾼다.

/** 배열 길이를 정하는 낱말. Claude는 이 값을 받지 않는다. */
const ARRAY_BOUND_KEYS = ['minItems', 'maxItems'];

/**
 * 모든 객체에 additionalProperties:false 를 붙인다. keep_array_bounds가 false면 배열 길이 제한을 뺀다.
 */
export function to_strict_schema(schema: unknown, keep_array_bounds: boolean): Record<string, unknown> {
  /** 스키마 한 마디를 바꾼다. */
  const convert = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(convert);
    if (typeof node !== 'object' || node === null) return node;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (!keep_array_bounds && ARRAY_BOUND_KEYS.includes(key)) continue;
      result[key] = convert(value);
    }
    if (result.type === 'object') result.additionalProperties = false;
    return result;
  };
  return convert(schema) as Record<string, unknown>;
}
