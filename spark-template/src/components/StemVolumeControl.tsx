import * as SliderPrimitive from "@radix-ui/react-slider"
import { SpeakerHigh, SpeakerNone } from "@phosphor-icons/react"

type StemVolumeControlProps = {
  label: string
  value: number
  onChange: (value: number) => void
}

export function StemVolumeControl({ label, value, onChange }: StemVolumeControlProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs font-medium">
        <span className="text-muted-foreground">Volume</span>
        <output className="min-w-10 text-right font-semibold tabular-nums" aria-live="polite">
          {Math.round(value)}%
        </output>
      </div>

      <div className="flex items-center gap-2.5">
        <SpeakerNone size={15} weight="fill" className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <SliderPrimitive.Root
          dir="ltr"
          value={[value]}
          min={0}
          max={100}
          step={1}
          onValueChange={(nextValue) => onChange(nextValue[0] ?? value)}
          className="relative flex h-5 w-full touch-none select-none items-center"
        >
          <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full bg-foreground" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={`${label} volume`}
            className="block size-4 shrink-0 rounded-full border-2 border-foreground bg-background shadow-sm outline-none transition-shadow hover:ring-4 hover:ring-ring/25 focus-visible:ring-4 focus-visible:ring-ring/35"
          />
        </SliderPrimitive.Root>
        <SpeakerHigh size={16} weight="fill" className="shrink-0 text-foreground" aria-hidden="true" />
      </div>

      <div className="flex justify-between px-6 text-[10px] font-medium tabular-nums text-muted-foreground" aria-hidden="true">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  )
}
