"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Btn, Field } from "@/components/ui";
import { completePasswordResetAction } from "@/app/customer-actions";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center font-body text-ink">
        <p className="mb-4">Invalid or missing reset token.</p>
        <Btn onClick={() => router.push("/")} full>
          Go to Homepage
        </Btn>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center font-body text-ink">
        <div className="mb-4 text-[40px]">✅</div>
        <p className="mb-6 font-display font-extrabold text-[18px]">
          Password reset successful!
        </p>
        <p className="mb-6 text-[15px]">
          You can now sign in with your new password.
        </p>
        <Btn onClick={() => router.push("/")} full>
          Return to Shop
        </Btn>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const { ok, error: serverError } = await completePasswordResetAction(token, password);
    if (!ok) {
      setError(serverError || "Failed to reset password.");
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="space-y-4">
      <Field
        label="New Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="At least 6 characters"
      />
      {error && (
        <div className="rounded border-2 border-[#EC5D8A] bg-[#FFF2F6] p-3 text-center text-[13px] font-extrabold text-[#EC5D8A]">
          {error}
        </div>
      )}
      <Btn onClick={handleSubmit} full>
        Save New Password
      </Btn>
    </div>
  );
}
