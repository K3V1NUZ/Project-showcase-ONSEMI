"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/supabase/demo";

type Step = "email" | "code";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    setBusy(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setStep("code");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setBusy(false);
      setErrorMsg(error.message);
      return;
    }

    router.replace(nextParam);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full space-y-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="nutriTrack"
            width={64}
            height={64}
            className="mx-auto w-16 h-16 rounded-2xl"
          />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">nutriTrack</h1>
          <p className="mt-1 text-sm text-muted">
            {step === "email"
              ? "Sign in with your email — we'll send you a code."
              : `Enter the 6-digit code sent to ${email}.`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-60"
              style={{ background: "var(--color-accent-strong)" }}
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              required
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full h-12 px-4 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] text-center text-2xl tracking-[0.3em] tabular-nums"
            />
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-60"
              style={{ background: "var(--color-accent-strong)" }}
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setErrorMsg(null);
              }}
              className="w-full h-10 text-sm text-muted"
            >
              Use a different email
            </button>
          </form>
        )}

        {isDemoMode() && (
          <div className="text-xs text-center text-muted">
            Demo mode (no Supabase configured): any email and any 6-digit
            code work. Data is stored only in this browser.
          </div>
        )}

        {errorMsg && (
          <div
            className="text-sm text-center"
            style={{ color: "var(--color-over)" }}
          >
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
