import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { cn } from "../utils/cn";
import {
  IconChat,
  IconClose,
  IconDashboard,
  IconLogo,
  IconLogout,
  IconMenu,
  IconMoon,
  IconShield,
  IconSun,
  IconUser,
} from "./Icons";

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = user
    ? [
        { to: "/dashboard", label: "Dashboard", icon: IconDashboard },
        { to: "/chat", label: "Chat", icon: IconChat },
        { to: "/profile", label: "Profile", icon: IconUser },
        ...(user.role === "admin"
          ? [{ to: "/admin", label: "Admin", icon: IconShield }]
          : []),
      ]
    : [];

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <IconLogo width={20} height={20} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Vision<span className="text-indigo-500">Chat</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                )
              }
            >
              <l.icon width={16} height={16} />
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
          </button>

          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link to="/profile" className="flex items-center gap-2">
                <Avatar name={user.name} color={user.avatarColor} />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <IconLogout width={16} height={16} />
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
              >
                Get Started
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Menu"
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
          {user ? (
            <div className="space-y-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-300"
                    )
                  }
                >
                  <l.icon width={18} height={18} />
                  {l.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600"
              >
                <IconLogout width={18} height={18} />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                Log in
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="rounded-lg bg-indigo-600 px-3 py-2.5 text-center text-sm font-semibold text-white">
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
