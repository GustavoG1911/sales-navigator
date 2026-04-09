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
      console.log("[useAuth] Buscando perfil para:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.message?.includes("querying schema")) {
          console.warn("[useAuth] Supabase ainda atualizando o schema. Entrando como 'user' por segurança.");
        } else {
          console.error("[useAuth] Erro ao buscar perfil:", error.message);
        }
        setRole("user");
        setLoading(false);
        return;
      } else if (data) {
        const dbRole = data.role as any;
        if (dbRole === "admin") setRole("admin");
        else if (dbRole === "gestor") setRole("gestor");
        else setRole("user");
      } else {
        setRole("user");
      }
    } catch (err) {
      console.error("[useAuth] Crash fatal no fetchRole capturado:", err);
      setRole("user");
    } finally {
      // Garante que o estado de loading saia de true independente de erro
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[useAuth] Auth state changed:", _event, session?.user?.email);
      setSession(session);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole("user");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
