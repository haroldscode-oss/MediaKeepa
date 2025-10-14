import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface FormatOptionProps {
  label: string
  selected: boolean
  onClick: () => void
  icon?: React.ReactNode
}

export function FormatOption({ label, selected, onClick, icon }: FormatOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative px-5 py-3.5 rounded-lg border-2 transition-all duration-200",
        "flex items-center gap-2.5 text-sm font-medium min-w-[120px] justify-center",
        selected
          ? "border-foreground bg-muted text-foreground"
          : "border-border bg-card hover:border-muted-foreground hover:bg-muted/50 text-foreground"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon && <span className="text-base">{icon}</span>}
      {label}
    </motion.button>
  )
}
