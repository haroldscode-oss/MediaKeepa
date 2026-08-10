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
      <span className="text-2xl font-bold text-foreground tracking-tight">
        MediaKeepa
      </span>
    </motion.div>
  )
}
