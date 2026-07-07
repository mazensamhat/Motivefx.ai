export async function clientLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
