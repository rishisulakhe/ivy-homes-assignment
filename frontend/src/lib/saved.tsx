import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Listing } from "./types";

type SavedValue = {
  ids: Set<string>;
  items: Listing[];
  loading: boolean;
  isSaved: (id: string) => boolean;
  toggle: (listing: Listing) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<SavedValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { email } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) {
      setItems([]);
      setIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ count: number; results: Listing[] }>("/v1/saved");
      setItems(data.results ?? []);
      setIds(new Set((data.results ?? []).map((r) => r.listing_id)));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isSaved = useCallback((id: string) => ids.has(id), [ids]);

  const remove = useCallback(
    async (id: string) => {
      const prevIds = new Set(ids);
      const prevItems = items;
      setIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      setItems((s) => s.filter((i) => i.listing_id !== id));
      try {
        await api(`/v1/saved/${id}`, { method: "DELETE" });
      } catch {
        setIds(prevIds);
        setItems(prevItems);
        toast.error("Could not remove this property.");
      }
    },
    [ids, items],
  );

  const toggle = useCallback(
    async (listing: Listing) => {
      if (!email) {
        toast.error("Sign in to save properties.");
        return;
      }
      const id = listing.listing_id;
      if (ids.has(id)) {
        await remove(id);
        return;
      }
      setIds((s) => new Set(s).add(id));
      setItems((s) => [listing, ...s]);
      try {
        await api("/v1/saved", { method: "POST", body: { listing_id: id } });
        toast.success("Saved to your shortlist");
      } catch {
        setIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        setItems((s) => s.filter((i) => i.listing_id !== id));
        toast.error("Could not save this property.");
      }
    },
    [email, ids, remove],
  );

  const value = useMemo<SavedValue>(
    () => ({ ids, items, loading, isSaved, toggle, remove, refresh }),
    [ids, items, loading, isSaved, toggle, remove, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSaved() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSaved must be used inside SavedProvider");
  return v;
}
