/** Endereço de bind HTTP/WS — use HOST=0.0.0.0 em containers Docker. */
export function resolveBindHost(): string {
  return process.env.HOST?.trim() || "127.0.0.1";
}
