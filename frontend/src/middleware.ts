import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo-hor.svg|logo-mark.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
