import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export const metadata = {
  title: "Reset Password | Rasi Mom & Baby",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-card border-3 border-ink bg-[#FFF9F2] p-6 shadow-hard-4 relative overflow-hidden">
        {/* Soft Pastel Mesh Base Canvas */}
        <div className="absolute inset-0 -z-20 min-h-full w-full bg-gradient-to-br from-[#FFEAF2] via-[#FFF6E5] to-[#E2F0FF] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="mb-6 text-center font-display text-[24px] font-extrabold text-ink">
            Reset Password
          </h1>
          <Suspense fallback={<div className="text-center font-display font-bold text-mute">Loading...</div>}>
            <ResetPasswordClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
