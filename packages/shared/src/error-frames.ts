/** Keep only first-party build assets and line numbers; omit messages, hosts, queries and user data. */
export function safeErrorFrames(stack: unknown): string[] {
  if(typeof stack !== "string") return [];
  const matches = stack.slice(0,12_000).match(/\/(?:terminal\/assets|_next\/static\/chunks)\/[A-Za-z0-9_.-]+\.js:\d{1,7}:\d{1,7}/g) ?? [];
  return [...new Set(matches)].slice(0,5);
}
export function validateErrorFrames(value:unknown):string[] {
  if(!Array.isArray(value)) return [];
  return value.filter((frame):frame is string=>typeof frame === "string" && /^\/(?:terminal\/assets|_next\/static\/chunks)\/[A-Za-z0-9_.-]+\.js:\d{1,7}:\d{1,7}$/.test(frame)).slice(0,5);
}
