"use client";

import React from "react"

import { useState } from "react";
import {
  Home,
  Compass,
  Trophy,
  User,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: Home, label: "Accueil", href: "/" },
      { icon: Compass, label: "Explorer", href: "/explorer" },
      { icon: Trophy, label: "Classement", href: "/classement" },
    ],
  },
  {
    title: "JOUEUR",
    items: [{ icon: User, label: "Mon Espace", href: "/mon-espace" }],
  },
  {
    title: "ORGANISATEUR",
    items: [{ icon: Calendar, label: "Mes Tournois", href: "/mes-tournois" }],
  },
];

interface EsportsSidebarProps {
  activeItem?: string;
  onNavigate?: (href: string) => void;
  username?: string;
  userRole?: string;
  avatarUrl?: string;
}

export function EsportsSidebar({
  activeItem = "/",
  onNavigate,
  username = "FlukyShadow",
  userRole = "Pro Player",
  avatarUrl,
}: EsportsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = (href: string) => {
    onNavigate?.(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
        style={{
          backgroundColor: "#0D0D14",
          borderImage: "linear-gradient(to bottom, #8B5CF6, transparent) 1",
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
          }}
        />

        {/* Logo Area */}
        <div className="relative flex h-16 items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #00F5FF)",
              }}
            >
              <span className="text-sm text-white">FB</span>
            </div>
            {!isCollapsed && (
              <span
                className="whitespace-nowrap font-bold tracking-wider transition-opacity duration-200"
                style={{ color: "#F8FAFC" }}
              >
                FLUKY BOYS
              </span>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[rgba(139,92,246,0.15)]",
              isCollapsed && "absolute -right-3 top-1/2 -translate-y-1/2 border border-[rgba(148,163,184,0.1)] bg-[#0D0D14]"
            )}
            style={{ color: "#94A3B8" }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6">
              {section.title && !isCollapsed && (
                <h3
                  className="mb-2 px-3 text-xs font-semibold tracking-widest"
                  style={{ color: "#64748B" }}
                >
                  {section.title}
                </h3>
              )}
              {section.title && isCollapsed && (
                <div className="mb-2 border-t border-[rgba(148,163,184,0.1)]" />
              )}

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = activeItem === item.href;
                  const Icon = item.icon;

                  const navButton = (
                    <button
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                        isActive
                          ? "text-[#F8FAFC]"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      )}
                      style={{
                        background: isActive
                          ? "rgba(139, 92, 246, 0.15)"
                          : undefined,
                      }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                          style={{
                            background:
                              "linear-gradient(to bottom, #8B5CF6, #00F5FF)",
                          }}
                        />
                      )}

                      {/* Glow effect on active */}
                      {isActive && (
                        <div
                          className="pointer-events-none absolute inset-0 rounded-lg"
                          style={{
                            boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
                          }}
                        />
                      )}

                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-200",
                          isActive
                            ? "drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
                            : "group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.6)]"
                        )}
                      />

                      {!isCollapsed && (
                        <span className="whitespace-nowrap text-sm font-medium">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );

                  return (
                    <li key={item.href}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="border-[rgba(148,163,184,0.1)] bg-[#1a1a24] text-[#F8FAFC]"
                          >
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        navButton
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="relative border-t border-[rgba(148,163,184,0.1)] p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 transition-all duration-200",
              isCollapsed ? "justify-center" : ""
            )}
          >
            {/* Avatar with gradient border */}
            <div className="relative shrink-0">
              <div
                className="absolute -inset-0.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #00F5FF)",
                }}
              />
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#1a1a24]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl || "/placeholder.svg"}
                    alt={username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#F8FAFC]">
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-[#F8FAFC]">
                  {username}
                </span>
                <span
                  className="inline-flex w-fit items-center rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "#A78BFA",
                  }}
                >
                  {userRole}
                </span>
              </div>
            )}

            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-all duration-200 hover:bg-[rgba(255,62,157,0.15)] hover:text-[#FF3E9D]"
                    onClick={() => console.log("Déconnexion")}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="border-[rgba(148,163,184,0.1)] bg-[#1a1a24] text-[#F8FAFC]"
                >
                  Déconnexion
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-[#94A3B8] transition-all duration-200 hover:bg-[rgba(255,62,157,0.15)] hover:text-[#FF3E9D]"
                  onClick={() => console.log("Déconnexion")}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="border-[rgba(148,163,184,0.1)] bg-[#1a1a24] text-[#F8FAFC]"
              >
                Déconnexion
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
