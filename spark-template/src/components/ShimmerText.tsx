import { cn } from "@/lib/utils"

interface ShimmerTextProps {
  text: string
  className?: string
}

export function ShimmerText({ text, className }: ShimmerTextProps) {
  return (
    <div className={cn("shimmer-text text-lg font-medium", className)}>
      {text}
    </div>
  )
}
