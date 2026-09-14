import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const DEMOS = ["demo1@ivy.homes", "demo2@ivy.homes", "demo3@ivy.homes"];
const DEMO_PASSWORD = "d376a9a8bb";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Ivy Homes Mumbai" },
      {
        name: "description",
        content: "Sign in to browse and shortlist Mumbai homes on Ivy Homes.",
      },
      { property: "og:title", content: "Sign in — Ivy Homes Mumbai" },
      {
        property: "og:description",
        content: "Sign in to browse and shortlist Mumbai homes on Ivy Homes.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, email: sessionEmail, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMOS[0]!);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && sessionEmail) void navigate({ to: "/listings", replace: true });
  }, [ready, sessionEmail, navigate]);

  const submit = async (e?: React.FormEvent, overrideEmail?: string) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(overrideEmail ?? email, overrideEmail ? DEMO_PASSWORD : password);
      await navigate({ to: "/listings", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <p className="font-display text-4xl font-semibold leading-tight text-white text-balance-tight">
            Mumbai's homes, read honestly.
          </p>
          <p className="mt-4 max-w-md text-white/85">
            Five thousand listings, checked for duplicates, bait pricing and broken records before
            they reach you.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-16">
        <div className="page-enter w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight">Ivy Homes</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mumbai</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to browse listings and keep your shortlist.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Use a demo account
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEmail(d);
                    setPassword(DEMO_PASSWORD);
                    void submit(undefined, d);
                  }}
                  className="rounded-full border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {d.split("@")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
