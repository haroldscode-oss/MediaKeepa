import { useEffect, useState } from "react"
import type { MouseEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, X } from "@phosphor-icons/react"
import { WebsiteIcon } from "@/components/WebsiteIcon"

const RECENT_URLS_KEY = "mediakeepa-recent-urls-v2"
const MAX_RECENT_URLS = 5
const RECENT_URLS_EVENT = "mediakeepa:recent-urls:update"

type RecentUrlEntry = {
  url: string
  title: string
  timestamp: number
}

type AddRecentUrlPayload = {
  url: string
  title: string
}

const isBrowser = typeof window !== "undefined"

function getRecentUrls(): RecentUrlEntry[] {
  if (!isBrowser) {
    return []
  }

  try {
    const stored = window.localStorage.getItem(RECENT_URLS_KEY)
    if (!stored) {
      return []
    }

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is RecentUrlEntry => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentUrlEntry).url === "string" &&
        typeof (item as RecentUrlEntry).title === "string"
      )
    })
  } catch {
    return []
  }
}

function saveRecentUrls(entries: RecentUrlEntry[]): void {
  if (!isBrowser) {
    return
  }

  window.localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent(RECENT_URLS_EVENT))
}

export function addRecentUrl({ url, title }: AddRecentUrlPayload): void {
  if (!isBrowser) {
    return
  }

  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return
  }

  const displayTitle = title.trim() || trimmedUrl
  const entries = getRecentUrls()
  const filtered = entries.filter((entry) => entry.url !== trimmedUrl)

  filtered.unshift({
    url: trimmedUrl,
    title: displayTitle,
    timestamp: Date.now()
  })

  if (filtered.length > MAX_RECENT_URLS) {
    filtered.length = MAX_RECENT_URLS
  }

  saveRecentUrls(filtered)
}

type RecentUrlsProps = {
  onUrlSelect: (url: string) => void
}

type RemoveUrlHandler = (url: string, event: MouseEvent<HTMLButtonElement>) => void

function formatHost(url: string): string {
  try {
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}

function useRecentUrls(): [RecentUrlEntry[], (entries: RecentUrlEntry[]) => void] {
  const [entries, setEntries] = useState<RecentUrlEntry[]>(() => getRecentUrls())

  useEffect(() => {
    if (!isBrowser) {
      return
    }

    const handleUpdate = () => {
      setEntries(getRecentUrls())
    }

    window.addEventListener(RECENT_URLS_EVENT, handleUpdate)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === RECENT_URLS_KEY) {
        handleUpdate()
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(RECENT_URLS_EVENT, handleUpdate)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  return [entries, setEntries]
}

export function RecentUrls({ onUrlSelect }: RecentUrlsProps) {
  const [entries, setEntries] = useRecentUrls()

  const removeUrl: RemoveUrlHandler = (targetUrl, event) => {
    event.stopPropagation()
    const updated = entries.filter((entry) => entry.url !== targetUrl)
    setEntries(updated)
    saveRecentUrls(updated)
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-medium">Recent URLs</h3>
        </div>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.button
                key={entry.url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => onUrlSelect(entry.url)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/60 transition-colors text-left group"
              >
                <WebsiteIcon
                  url={entry.url}
                  className="w-5 h-5 text-muted-foreground flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{formatHost(entry.url)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(event) => removeUrl(entry.url, event)}
                  aria-label="Remove URL"
                >
                  <X size={14} />
                </Button>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
