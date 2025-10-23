import { motion } from "framer-motion"
import { Video } from "@phosphor-icons/react"
import { useState } from "react"

export function MediaKeepaLogo() {
  const [isShaking, setIsShaking] = useState(false)

  const handleClick = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
      }}
      onAnimationComplete={() => {
        const logoElement = document.querySelector('.logo-icon');
        if (logoElement) {
          logoElement.classList.add('shake-once');
          setTimeout(() => {
            logoElement.classList.remove('shake-once');
          }, 500);
        }
      }}
      className="flex items-center gap-2"
    >
      <motion.div
        className="flex items-center justify-center logo-icon cursor-pointer"
        animate={isShaking ? { rotate: [0, -5, 5, -5, 0] } : {}}
        transition={{ duration: 0.5 }}
        onClick={handleClick}
      >
        <Video weight="fill" size={32} style={{ color: '#8B5CF6' }} />
      </motion.div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-foreground tracking-tight">
          MediaKeepa
        </span>
        <span className="px-2.5 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.6)] dark:shadow-[0_0_20px_rgba(139,92,246,0.5)] translate-y-0.5">
          BETA
        </span>
      </div>
    </motion.div>
  )
}
