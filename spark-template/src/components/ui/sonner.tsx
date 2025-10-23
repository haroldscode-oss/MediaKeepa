import { useTheme } from "next-themes"
import { CSSProperties } from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, resolvedTheme } = useTheme()
  const appliedTheme = (resolvedTheme ?? theme ?? "system") as ToasterProps["theme"]

  return (
    <Sonner
      theme={appliedTheme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--normal-description": "var(--popover-foreground)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--popover-foreground)",
          "--success-border": "var(--border)",
          "--success-description": "var(--popover-foreground)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
