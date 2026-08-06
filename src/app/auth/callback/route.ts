import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("OAuth callback error:", error);
    // You could redirect to a specific error page if you had one, but back to root is safe
    return NextResponse.redirect(`${origin}/`);
  }

  const user = data.session.user;

  if (user) {
    const adminClient = createAdminClient();
    
    // Check if customer exists in our public.customers table
    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id")
      .eq("id", user.id)
      .single();

    // If new, insert into public.customers
    if (!existingCustomer) {
      const email = user.email || "";
      // Google places full name in user_metadata
      const name = user.user_metadata?.full_name || email.split("@")[0] || "Guest";

      await adminClient.from("customers").insert({
        id: user.id,
        phone: null, // Google OAuth typically doesn't provide phone
        email: email,
        name: name,
        points: 0,
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
