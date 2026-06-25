"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Mic2,
  Puzzle,
  Users,
  Settings,
  Moon,
  Sun,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useState } from "react";
import { GlobalSearch } from "@/components/bonus/GlobalSearch";
import { ComingSoon } from "@/components/ComingSoon";

const navItems = [
  { icon: Home, label: "Meetings", href: "/meetings", active: true },
  { icon: Mic2, label: "Notetaker", href: "#", comingSoon: true },
  { icon: Puzzle, label: "Integrations", href: "#", comingSoon: true },
  { icon: Users, label: "Team", href: "#", comingSoon: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-gray-100 dark:bg-[#1a1a1f] border-r border-gray-200 dark:border-[#2e2e38] flex flex-col z-40 select-none">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200 dark:border-[#2e2e38]">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Mic2 size={16} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-[15px] tracking-tight">Fireflies</span>
        </div>

        {/* Search */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-[#25252c] hover:bg-gray-300 dark:hover:bg-[#2a2a32] text-gray-500 dark:text-gray-400 text-sm transition-colors"
          >
            <Search size={14} />
            <span>Search...</span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ icon: Icon, label, href, comingSoon }) => {
            const isActive = href !== "#" && pathname.startsWith(href);
            if (comingSoon) {
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-default opacity-60"
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  <span className="ml-auto text-[10px] bg-gray-200 dark:bg-[#2e2e38] text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">
                    Soon
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-violet-600/20 text-violet-300 font-medium"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#25252c] hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-200 dark:border-[#2e2e38] p-3 space-y-1">
          {/* Settings */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-default opacity-60"
          >
            <Settings size={17} />
            <span>Settings</span>
            <span className="ml-auto text-[10px] bg-gray-200 dark:bg-[#2e2e38] text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">
              Soon
            </span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#25252c] hover:text-gray-900 dark:hover:text-white transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 dark:text-white font-medium truncate">Default User</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">user@example.com</div>
            </div>
            <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* Global Search overlay */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
