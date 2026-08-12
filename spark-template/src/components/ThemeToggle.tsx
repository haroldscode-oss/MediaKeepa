import { useEffect, useState } from "react"
import { Moon, Sun } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

type Theme = "light" | "dark"

function getDocumentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light"
    return getDocumentTheme()
  })

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = localStorage.getItem("theme") as Theme | null
    const initialTheme = savedTheme || "light"

    root.classList.remove("light", "dark")
    root.classList.add(initialTheme)
    setTheme(initialTheme)

    // Downloader and separator pages deliberately stay mounted so their work is
    // preserved during navigation. Keep every mounted toggle synchronized with
    // the single theme applied to the document root.
    const observer = new MutationObserver(() => {
      setTheme(getDocumentTheme())
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const currentTheme = getDocumentTheme()
    const newTheme: Theme = currentTheme === "light" ? "dark" : "light"
    setTheme(newTheme)

    root.classList.add("theme-changing")
    void root.offsetWidth

    root.classList.remove("light", "dark")
    root.classList.add(newTheme)
    void root.offsetWidth
    root.classList.remove("theme-changing")
    
    localStorage.setItem("theme", newTheme)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative rounded-full h-10 w-10 hover:bg-muted"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <motion.div
        initial={false}
        animate={{
          scale: theme === "light" ? 1 : 0,
          rotate: theme === "light" ? 0 : 90,
          opacity: theme === "light" ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute"
      >
        <Sun size={20} weight="fill" className="text-foreground" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          scale: theme === "dark" ? 1 : 0,
          rotate: theme === "dark" ? 0 : -90,
          opacity: theme === "dark" ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute"
      >
        <Moon size={20} weight="fill" />
      </motion.div>
    </Button>
  )
}
