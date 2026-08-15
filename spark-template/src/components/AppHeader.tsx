import { NavLink, useLocation } from "react-router-dom"
import { DownloadSimple, FilmSlate, Image, Waveform } from "@phosphor-icons/react"
import { MediaKeepaLogo } from "@/components/MediaKeepaLogo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/downloader", label: "Media Downloader", icon: DownloadSimple },
  { to: "/audio-separator", label: "Audio Separator", icon: Waveform },
  { to: "/background-remover", label: "Background Remover", icon: Image },
  { to: "/video-enhancer", label: "Video Enhancer", icon: FilmSlate },
]

export function AppHeader() {
  const { pathname } = useLocation()

  return (
    <header className="flex items-center justify-between gap-2">
      <div className="shrink-0">
        <MediaKeepaLogo />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <nav className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-sm" aria-label="MediaKeepa tools">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => {
                const isCurrent = isActive || (to === "/downloader" && pathname === "/")
                return cn(
                  "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isCurrent && "bg-foreground text-background hover:text-background"
                )
              }}
              aria-label={label}
            >
              <Icon size={13} weight="bold" />
              <span className="hidden whitespace-nowrap sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
