import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, email } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !email) {
      void navigate({ to: "/login", replace: true });
    }
  }, [ready, email, navigate]);

  if (!ready || !email) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
