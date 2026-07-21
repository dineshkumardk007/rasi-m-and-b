"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { registerCustomerAction } from "@/app/actions";

/**
 * Customer session. Live mode = Supabase phone OTP (primary auth per spec).
 * Demo mode (no Supabase keys) = simulated OTP so flows stay testable.
 */

export interface CustomerSession {
  name: string;
  phone: string;
}

interface SessionContextValue {
  session: CustomerSession | null;
  isDemo: boolean;
  sendOtp: (phone: string) => Promise<{ ok: boolean; message?: string }>;
  verifyOtp: (phone: string, otp: string, name: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const DEMO_KEY = "rasi.session";

export function SessionProvider({
  children,
  isDemo,
}: {
  children: ReactNode;
  isDemo: boolean;
}) {
  const [session, setSession] = useState<CustomerSession | null>(null);

  useEffect(() => {
    if (isDemo) {
      try {
        const raw = window.localStorage.getItem(DEMO_KEY);
        if (raw) setSession(JSON.parse(raw) as CustomerSession);
      } catch {
        /* ignore */
      }
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        setSession({
          name: (data.user.user_metadata?.name as string) ?? "",
          phone: data.user.phone ?? "",
        });
    });
  }, [isDemo]);

  const sendOtp = useCallback<SessionContextValue["sendOtp"]>(
    async (phone) => {
      const clean = phone.replace(/\D/g, "").slice(-10);
      if (clean.length !== 10) return { ok: false, message: "bad_phone" };
      if (isDemo) return { ok: true }; // simulated; any 6 digits verify
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ phone: `+91${clean}` });
      return error ? { ok: false, message: error.message } : { ok: true };
    },
    [isDemo],
  );

  const verifyOtp = useCallback<SessionContextValue["verifyOtp"]>(
    async (phone, otp, name) => {
      const clean = phone.replace(/\D/g, "").slice(-10);
      const customerName = name.trim() || "Customer";

      if (isDemo) {
        if (!/^\d{6}$/.test(otp)) return { ok: false, message: "bad_otp" };
        await registerCustomerAction(customerName, clean);
        const s = { name: customerName, phone: clean };
        window.localStorage.setItem(DEMO_KEY, JSON.stringify(s));
        setSession(s);
        return { ok: true };
      }

      const supabase = createClient();
      let { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${clean}`,
        token: otp,
        type: "sms",
      });
      if (error && error.message.includes("verification type")) {
        const retry = await supabase.auth.verifyOtp({
          phone: `+91${clean}`,
          token: otp,
          type: "phone_change",
        });
        data = retry.data;
        error = retry.error;
      }
      if (error || !data.user) return { ok: false, message: error?.message };
      if (name) await supabase.auth.updateUser({ data: { name: customerName } });

      // Upsert customer record by unique phone number in database
      await registerCustomerAction(customerName, clean);

      setSession({ name: customerName, phone: clean });
      return { ok: true };
    },
    [isDemo],
  );

  const signOut = useCallback(async () => {
    if (isDemo) {
      window.localStorage.removeItem(DEMO_KEY);
    } else {
      await createClient().auth.signOut();
    }
    setSession(null);
  }, [isDemo]);

  const value = useMemo(
    () => ({ session, isDemo, sendOtp, verifyOtp, signOut }),
    [session, isDemo, sendOtp, verifyOtp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
