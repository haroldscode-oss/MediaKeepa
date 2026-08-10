import { NavLink, useLocation } from "react-router-dom"
import { DownloadSimple, Waveform } from "@phosphor-icons/react"
import { MediaKeepaLogo } from "@/components/MediaKeepaLogo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/downloader", label: "Media Downloader", icon: DownloadSimple },
  { to: "/audio-separator", label: "Audio Separator", icon: Waveform },
]

export function AppHeader() {
  const { pathname } = useLocation()

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <MediaKeepaLogo />
      </div>

      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm" aria-label="MediaKeepa tools">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => {
                const isCurrent = isActive || (to === "/downloader" && pathname === "/")
                return cn(
                  "flex h-8 items-center gap-2 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3",
                  isCurrent && "bg-foreground text-background hover:text-background"
                )
              }}
              aria-label={label}
            >
              <Icon size={16} weight="bold" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
