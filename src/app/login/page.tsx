import { Suspense } from "react";
import { signIn, signUp } from "@/app/login/actions";
import { LoginAlerts, LoginNextField } from "@/app/login/LoginDynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}

// Reading searchParams requires excluding the dynamic bits from the static
// prerender shell — Cache Components needs that boundary marked with
// Suspense rather than awaited directly in the page body.
export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-card-foreground ring-1 ring-border shadow-sm">
        <h1 className="mb-6 text-lg font-semibold">Đăng nhập CoralTask</h1>

        <Suspense>
          <LoginAlerts searchParams={searchParams} />
        </Suspense>

        <form className="flex flex-col gap-4">
          <Suspense>
            <LoginNextField searchParams={searchParams} />
          </Suspense>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <Button type="submit" formAction={signIn} className="flex-1">
              Đăng nhập
            </Button>
            <Button type="submit" formAction={signUp} variant="outline" className="flex-1">
              Đăng ký
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
