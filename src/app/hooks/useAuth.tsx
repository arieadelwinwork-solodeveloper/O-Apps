import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { AppUser } from "../types";

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpOwner: (
    email: string,
    password: string,
    fullName: string,
    businessName: string
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(userId: string, email?: string): Promise<AppUser | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .select("business_id, role, full_name")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: userId,
    email,
    businessId: data.business_id,
    role: data.role,
    fullName: data.full_name,
  };
}

/** Trigger DB butuh sedikit waktu setelah signUp — coba beberapa kali. */
async function loadProfileWithRetry(
  userId: string,
  email?: string,
  attempts = 6
): Promise<AppUser | null> {
  for (let i = 0; i < attempts; i++) {
    const profile = await loadProfile(userId, email);
    if (profile) return profile;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  async function hydrate() {
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(await loadProfile(session.user.id, session.user.email ?? undefined));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("[auth] hydrate gagal:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    hydrate();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? undefined).then(setUser);
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        if (!supabase) throw new Error("Supabase belum dikonfigurasi");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Email atau password salah");
        await hydrate();
      },
      async signUpOwner(email, password, fullName, businessName) {
        if (!supabase) throw new Error("Supabase belum dikonfigurasi");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              business_name: businessName.trim(),
              role: "owner",
            },
          },
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered")) {
            throw new Error("Email sudah terdaftar");
          }
          throw new Error("Gagal mendaftar, periksa data kamu");
        }

        if (data.session?.user) {
          const profile = await loadProfileWithRetry(
            data.session.user.id,
            data.session.user.email ?? undefined
          );
          if (!profile) {
            throw new Error(
              "Akun dibuat tetapi profil belum siap. Pastikan migration 0002_signup_owner_trigger.sql sudah dijalankan di Supabase."
            );
          }
          setUser(profile);
          return { needsEmailConfirmation: false };
        }

        return { needsEmailConfirmation: true };
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
        setUser(null);
      },
      refresh: hydrate,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
