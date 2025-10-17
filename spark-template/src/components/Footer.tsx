import { Link } from "react-router-dom"
import { motion } from "framer-motion"

export function Footer() {
  const links = [
    { label: "DMCA Policy", page: "dmca" },
    { label: "Terms of Service", page: "terms" },
    { label: "Privacy Policy", page: "privacy" },
    { label: "How It Works", page: "how-it-works" },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full border-t border-border mt-auto"
    >
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-3">
        <motion.nav
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-x-3 md:gap-x-4 flex-wrap"
        >
          {links.map((link) => (
            <motion.div key={link.page} variants={itemVariants}>
              <Link
                to={`/legal/${link.page}`}
                className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </motion.nav>
      </div>
    </motion.footer>
  )
}
