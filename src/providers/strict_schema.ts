// Adapts a response JSON schema to each provider's "strict" structured-output rules.

/** Claude rejects these keys. */
const ARRAY_BOUND_KEYS = ['minItems', 'maxItems'];

/**
 * Adds additionalProperties:false to every object. Drops array length limits when keep_array_bounds is false.
 */
export function to_strict_schema(schema: unknown, keep_array_bounds: boolean): Record<string, unknown> {
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
