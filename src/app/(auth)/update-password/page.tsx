import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "New password" };

export default function Page() {
  return <AuthForm mode="update" />;
}
