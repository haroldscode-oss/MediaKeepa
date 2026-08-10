import { ComponentProps } from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

export function StemFader({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
  const currentValue = Array.isArray(value) ? value[0] : (Array.isArray(defaultValue) ? defaultValue[0] : min)
  const fillPercentage = ((currentValue - min) / (max - min)) * 100

  return (
    <SliderPrimitive.Root
      data-slot="stem-fader"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn("relative flex h-8 w-full touch-none select-none items-center", className)}
      {...props}
    >
      <div className="pointer-events-none relative flex h-full w-full items-center">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="0,35 100,45 100,55 0,65" className="fill-muted stroke-muted-foreground/40" strokeWidth="1" />
          <polygon
            points={`0,35 ${fillPercentage},${35 + fillPercentage * 0.1} ${fillPercentage},${55 + fillPercentage * 0.1} 0,65`}
            className="fill-foreground/70"
          />
        </svg>
      </div>

      <SliderPrimitive.Track className="absolute inset-0 w-full opacity-0">
        <SliderPrimitive.Range className="absolute h-full opacity-0" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="relative z-10 block h-6 w-3 shrink-0 rounded-sm border-2 border-foreground bg-background shadow-md outline-none transition-shadow hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/40" />
    </SliderPrimitive.Root>
  )
}
