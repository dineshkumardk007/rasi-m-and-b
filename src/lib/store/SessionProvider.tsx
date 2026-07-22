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
import {
  ensureCustomerProfileByEmailAction,
  recordCustomerActivityAction,
  registerCustomerAction,
  registerCustomerWithEmailAction,
  registerCustomerWithPasswordAction,
  signInWithEmailAction,
  signInWithPasswordAction,
} from "@/app/actions";

/**
 * Customer session. Supports phone OTP, Phone + Password, & Email + Password authentication.
 */

export interface CustomerSession {
  name: string;
  phone: string;
  email?: string;
}

interface SessionContextValue {
  session: CustomerSession | null;
  isDemo: boolean;
  sendOtp: (phone: string) => Promise<{ ok: boolean; message?: string }>;
  verifyOtp: (phone: string, otp: string, name: string) => Promise<{ ok: boolean; message?: string }>;
  signInWithPassword: (phone: string, password: string) => Promise<{ ok: boolean; name?: string; message?: string }>;
  registerWithPassword: (name: string, phone: string, password: string) => Promise<{ ok: boolean; name?: string; message?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ ok: boolean; name?: string; message?: string }>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<{ ok: boolean; name?: string; message?: string }>;
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
        if (raw) {
          const s = JSON.parse(raw) as CustomerSession;
          setSession(s);
          if (s?.phone) recordCustomerActivityAction(s.phone);
        }
      } catch {
        /* ignore */
      }
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = (data.user.user_metadata?.name as string) ?? "";
        const phone = data.user.phone ?? "";
        setSession({ name, phone });
        if (phone) recordCustomerActivityAction(phone);
      }
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

  const signInWithPassword = useCallback(
    async (phone: string, password: string) => {
      const res = await signInWithPasswordAction(phone, password);
      if (res.ok && res.name && res.phone) {
        const s = { name: res.name, phone: res.phone };
        if (isDemo) window.localStorage.setItem(DEMO_KEY, JSON.stringify(s));
        setSession(s);
        return { ok: true, name: res.name };
      }
      return { ok: false, message: res.error ?? "Login failed" };
    },
    [isDemo],
  );

  const registerWithPassword = useCallback(
    async (name: string, phone: string, password: string) => {
      const res = await registerCustomerWithPasswordAction(name, phone, password);
      if (res.ok && res.name && res.phone) {
        const s = { name: res.name, phone: res.phone };
        if (isDemo) window.localStorage.setItem(DEMO_KEY, JSON.stringify(s));
        setSession(s);
        return { ok: true, name: res.name };
      }
      return { ok: false, message: res.error ?? "Registration failed" };
    },
    [isDemo],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      if (!isDemo) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error && !error.message.includes("Email not confirmed")) {
          // Supabase Auth said no. Fall back to the customers table, which is
          // where accounts created before Supabase Auth still live.
          const dbRes = await signInWithEmailAction(cleanEmail, password);
          if (dbRes.ok && dbRes.name) {
            const s = { name: dbRes.name, phone: "", email: cleanEmail };
            setSession(s);
            return { ok: true, name: dbRes.name };
          }
          return { ok: false, message: error.message };
        }
        // Supabase Auth said yes — that settles it. Don't re-check the password
        // against the customers table; a Supabase-Auth-only user has no row
        // there, and demanding one would turn a correct password into a lockout.
        const profileName = (data?.user?.user_metadata?.name as string) ?? "";
        const profile = await ensureCustomerProfileByEmailAction(cleanEmail, profileName);
        const s = { name: profile.name || profileName || "Customer", phone: "", email: cleanEmail };
        setSession(s);
        return { ok: true, name: s.name };
      }
      const res = await signInWithEmailAction(cleanEmail, password);
      if (res.ok && res.name) {
        const s = { name: res.name, phone: "", email: cleanEmail };
        if (isDemo) window.localStorage.setItem(DEMO_KEY, JSON.stringify(s));
        setSession(s);
        return { ok: true, name: res.name };
      }
      return { ok: false, message: res.error ?? "Login failed" };
    },
    [isDemo],
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const customerName = name.trim() || "Customer";
      const cleanEmail = email.trim().toLowerCase();

      if (!isDemo) {
        try {
          const supabase = createClient();
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { name: customerName },
            },
          });
        } catch {
          /* ignore auth error and proceed with database customer creation */
        }
      }

      const res = await registerCustomerWithEmailAction(customerName, cleanEmail, password);
      if (res.ok) {
        const s = { name: res.name || customerName, phone: "", email: cleanEmail };
        if (isDemo) window.localStorage.setItem(DEMO_KEY, JSON.stringify(s));
        setSession(s);
        return { ok: true, name: s.name };
      }
      return { ok: false, message: res.error ?? "Registration failed" };
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
    () => ({
      session,
      isDemo,
      sendOtp,
      verifyOtp,
      signInWithPassword,
      registerWithPassword,
      signInWithEmail,
      registerWithEmail,
      signOut,
    }),
    [
      session,
      isDemo,
      sendOtp,
      verifyOtp,
      signInWithPassword,
      registerWithPassword,
      signInWithEmail,
      registerWithEmail,
      signOut,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
