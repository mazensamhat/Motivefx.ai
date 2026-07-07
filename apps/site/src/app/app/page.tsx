import { redirect } from "next/navigation";

export const metadata = {
  title: "Terminal — MotiveFX.AI",
};

export default function AppPage() {
  redirect("/terminal");
}
