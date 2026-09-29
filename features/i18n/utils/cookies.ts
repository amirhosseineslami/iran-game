/**
 * Cookie utilities for locale persistence.
 * Avoids direct document.cookie manipulation in React hooks/components.
 */

const COOKIE_NAME = "NEXT_LOCALE";

export interface CookieOptions {
  path?: string;
  maxAge?: number;
  sameSite?: "strict" | "lax" | "none";
}

export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const {
    path = "/",
    maxAge = 31536000,
    sameSite = "lax",
  } = options;

  if (typeof document === "undefined") return;

  document.cookie = `${name}=${value}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`;
}

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : undefined;
}
