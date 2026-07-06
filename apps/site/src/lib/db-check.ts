export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url?.startsWith("postgresql://") || url?.startsWith("postgres://"));
}

export function databaseConfigHint(): string {
  if (isDatabaseConfigured()) return "";
  return "DATABASE_URL is not set. Add Supabase Postgres URL to apps/site/.env.local (and Vercel env vars for production).";
}
