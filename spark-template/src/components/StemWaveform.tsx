import { useState, type KeyboardEvent, type MouseEvent } from "react"
import { motion } from "framer-motion"

type StemWaveformProps = {
  label: string
  waveform: number[]
  currentTime: number
  duration: number
  isPlaying: boolean
  onSeek: (time: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function StemWaveform({
  label,
  waveform,
  currentTime,
  duration,
  isPlaying,
  onSeek,
}: StemWaveformProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0

  const timeFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const percentage = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    return percentage * duration
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!duration) return

    let nextTime: number | null = null
    if (event.key === "ArrowLeft") nextTime = currentTime - 5
    if (event.key === "ArrowRight") nextTime = currentTime + 5
    if (event.key === "Home") nextTime = 0
    if (event.key === "End") nextTime = duration
    if (nextTime === null) return

    event.preventDefault()
    onSeek(clamp(nextTime, 0, duration))
  }

  return (
    <div className="min-w-0 w-full">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} timeline`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.floor(duration))}
        aria-valuenow={Math.floor(currentTime)}
        aria-valuetext={`${formatAudioTime(currentTime)} of ${formatAudioTime(duration)}`}
        className="group relative cursor-pointer rounded-xl bg-muted/75 px-3 py-2 outline-none ring-offset-background transition-shadow hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => duration && onSeek(timeFromPointer(event))}
        onMouseMove={(event) => duration && setHoverTime(timeFromPointer(event))}
        onMouseLeave={() => setHoverTime(null)}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex h-14 items-center gap-[2px] overflow-hidden">
          {waveform.map((height, index) => {
            const barPosition = (index + 0.5) / waveform.length
            const hasPlayed = barPosition <= progress
            const activeBar = Math.round(progress * (waveform.length - 1))
            const distanceFromPlayhead = Math.abs(index - activeBar)
            const isActive = isPlaying && distanceFromPlayhead <= 2
            return (
              <motion.span
                key={index}
                className={`min-w-px flex-1 rounded-full transition-colors duration-100 ${hasPlayed || isActive ? "bg-foreground" : "bg-foreground/20"}`}
                style={{ height: `${Math.round(height * 82 + 12)}%`, transformOrigin: "center" }}
                animate={{
                  scaleY: isActive ? [1, 1.32 - distanceFromPlayhead * 0.08, 1] : 1,
                  opacity: isActive ? 1 : hasPlayed ? 0.9 : 0.55,
                }}
                transition={{
                  duration: 0.32,
                  ease: "easeInOut",
                  repeat: isActive ? Infinity : 0,
                  delay: isActive ? distanceFromPlayhead * 0.025 : 0,
                }}
              />
            )
          })}

          {hoverTime !== null && duration > 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-background shadow-sm"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {formatAudioTime(hoverTime)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
        <span>{formatAudioTime(currentTime)}</span>
        <span>{formatAudioTime(duration)}</span>
      </div>
    </div>
  )
}
