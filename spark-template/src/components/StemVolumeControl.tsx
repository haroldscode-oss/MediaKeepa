import { useEffect, useRef, useState } from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { SpeakerHigh, SpeakerLow, SpeakerSlash } from "@phosphor-icons/react"

type StemVolumeControlProps = {
  label: string
  value: number
  onChange: (value: number) => void
}

export function StemVolumeControl({ label, value, onChange }: StemVolumeControlProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const lastAudibleValueRef = useRef(value > 0 ? value : 100)
  const VolumeIcon = value <= 0 ? SpeakerSlash : value < 50 ? SpeakerLow : SpeakerHigh
  const showValue = isDragging || isFocused || isHovered

  useEffect(() => {
    if (value > 0) lastAudibleValueRef.current = value
  }, [value])

  const toggleMute = () => {
    onChange(value > 0 ? 0 : lastAudibleValueRef.current)
  }

  return (
    <div
      className="flex min-w-0 items-center gap-2.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        aria-label={value > 0 ? `Mute ${label}` : `Unmute ${label}`}
        aria-pressed={value <= 0}
        onClick={toggleMute}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground outline-none transition-all duration-200 hover:bg-muted hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
      >
        <VolumeIcon size={22} weight="bold" aria-hidden="true" className="transition-transform duration-150 active:scale-90" />
      </button>
      <SliderPrimitive.Root
        dir="ltr"
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(nextValue) => onChange(nextValue[0] ?? value)}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        className="relative flex h-9 w-full touch-none select-none items-center cursor-pointer"
      >
        <SliderPrimitive.Track className="relative h-3 grow overflow-hidden rounded-full bg-muted/75 p-0.5 border border-border/30 shadow-inner">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-foreground transition-all duration-75" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={`${label} volume`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="relative block size-5 shrink-0 rounded-full border-2 border-foreground bg-background shadow-md outline-none transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:ring-4 focus-visible:ring-ring/30 cursor-grab active:cursor-grabbing"
        >
          <output
            aria-live="polite"
            className={`pointer-events-none absolute bottom-[calc(100%+0.6rem)] left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold tabular-nums text-background shadow-md border border-background/20 transition-[opacity,transform] duration-150 ${
              showValue ? "-translate-y-0 opacity-100 scale-100" : "translate-y-1 opacity-0 scale-90"
            }`}
          >
            {Math.round(value)}%
          </output>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </div>
  )
}
