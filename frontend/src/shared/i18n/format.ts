export const format = (template: string, params: Record<string, string | number> = {}) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
