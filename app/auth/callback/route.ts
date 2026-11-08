import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth / email-confirmation return point.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) await createClient().auth.exchangeCodeForSession(code);
  return NextResponse.redirect(`${origin}/home`);
}
