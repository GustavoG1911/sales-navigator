import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "gestor" | "user";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: UserRole;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: "user",
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("user");

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        const dbRole = data.role as any;
        if (dbRole === "admin") setRole("admin");
        else if (dbRole === "gestor") setRole("gestor");
        else setRole("user");
      } else {
        setRole("user");
      }
    } catch (err) {
      setRole("user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Ouvinte principal de estados de Auth do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log("[useAuth] Evento de Auth detetado:", _event);
      setSession(newSession);
      
      if (newSession?.user) {
        await fetchRole(newSession.user.id);
      } else {
        setRole("user");
        setLoading(false);
      }
    });

    // 2. Fallback: Se o onAuthStateChange demorar, tenta pegar a sessão inicial
    const checkInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession && !session) {
        setSession(initialSession);
        await fetchRole(initialSession.user.id);
      } else if (!initialSession) {
        setLoading(false);
      }
    };

    checkInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setRole("user");
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
