import { Link, Outlet, useLocation } from "react-router-dom";

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">
            StitchQylt
          </Link>

          <nav className="flex items-center gap-4 text-sm text-zinc-700">
            <Link
              to="/explore"
              className={`hover:underline ${location.pathname.startsWith("/explore") ? "font-medium" : ""}`}
            >
              Explore
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-zinc-500">
          StitchQylt Magazine — a prototype nursery of sandboxed artifacts.
        </div>
      </footer>
    </div>
  );
}
