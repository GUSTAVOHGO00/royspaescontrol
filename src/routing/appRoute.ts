export type AppRoute = "store" | "admin" | "recovery";

export function resolveAppRoute(pathname: string): AppRoute {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/recuperar-senha")) return "recovery";
  return "store";
}
