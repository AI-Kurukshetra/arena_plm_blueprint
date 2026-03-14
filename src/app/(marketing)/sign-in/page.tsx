import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";

export default async function SignInPage() {
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
        <SignInForm />
      </div>
    </main>
  );
}
