import { motion } from "framer-motion"
import { Video } from "@phosphor-icons/react"

export function MediaKeepaLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex items-center gap-2"
    >
      <motion.div
        className="flex items-center justify-center"
        whileHover={{ rotate: [0, -5, 5, -5, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Video weight="fill" size={32} className="text-primary" />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-foreground tracking-tight">
          MediaKeepa
        </span>
      </div>
    </motion.div>
  )
}
