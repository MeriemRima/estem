import { redirect } from "next/navigation";
import ChangePasswordForm from "./change-password-form";
import { getSession } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ChangePasswordForm />;
}
