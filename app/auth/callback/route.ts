import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth / email-confirmation return point.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Provider errors (e.g. the user cancelled Google sign-in) arrive as ?error=...; a missing or bad code means the link failed.
  if (!code || searchParams.get("error")) return NextResponse.redirect(`${origin}/login?error=callback`);
  const { error } = await createClient().auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=callback`);
  return NextResponse.redirect(`${origin}/home`);
}
