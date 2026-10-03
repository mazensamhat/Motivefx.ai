import { redirect } from "next/navigation";

type TerminalSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TerminalPage({
  searchParams,
}: {
  searchParams: TerminalSearchParams;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(`/terminal/index.html${query ? `?${query}` : ""}`);
}
