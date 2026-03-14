import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";

export default async function SignUpPage() {
  const access = await getAuthenticatedAppContext();

  if (access.status === "authorized") {
    redirect("/dashboard");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  return (
    <main className="min-h-screen px-5 py-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SignUpForm />
      </div>
    </main>
  );
}
