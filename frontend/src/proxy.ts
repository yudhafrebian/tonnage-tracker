import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE, locales, type Locale } from "@/shared/i18n/config";

const AUTH_COOKIE = "tonnage_token";
const ONE_YEAR = 60 * 60 * 24 * 365;

function pickLocale(req: NextRequest): Locale {
  const fromCookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (fromCookie && hasLocale(fromCookie)) return fromCookie;
  // "id-ID,id;q=0.9,en;q=0.8" -> ["id", "id", "en"]
  const accepted = (req.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => part.split(";")[0]!.trim().slice(0, 2).toLowerCase());
  return accepted.find(hasLocale) ?? defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Link berprefix (/en/dashboard): simpan pilihan di cookie, lalu buang prefix dari URL.
  const prefixed = locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (prefixed) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(prefixed.length + 1) || "/";
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, prefixed, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
    return res;
  }

  // 2. Auth, sama seperti sebelumnya.
  const loggedIn = req.cookies.has(AUTH_COOKIE);
  if (pathname.startsWith("/dashboard") && !loggedIn) {
    return NextResponse.redirect(new URL(`/?next=${encodeURIComponent(pathname)}`, req.url));
  }
  if (pathname === "/" && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. /dashboard -> /id/dashboard secara internal; URL di browser tidak berubah.
  const url = req.nextUrl.clone();
  url.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Semua halaman, kecuali file internal Next, /api, dan file statis (favicon.ico, gambar).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
