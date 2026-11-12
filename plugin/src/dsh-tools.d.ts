/**
 * Minimal ambient surface for the host-provided DSH tools package.
 *
 * The harness injects `@deepseek-ai/dsh-tools` at runtime (peer dependency).
 * Only the two exports this plugin touches are declared, so the plugin can be
 * built without pinning a second copy of the host package.
 */
declare module '@deepseek-ai/dsh-tools' {
  export class ToolArgsError extends Error {
    readonly violations: string[];
    constructor(violations: string[]);
  }

  export function defineTool<T = unknown>(options: T): unknown;
}
