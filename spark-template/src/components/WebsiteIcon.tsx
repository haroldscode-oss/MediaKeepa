import { Globe } from "@phosphor-icons/react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

type WebsiteIconProps = {
  url: string
  className?: string
}

export function WebsiteIcon({ url, className = "" }: WebsiteIconProps) {
  const [faviconError, setFaviconError] = useState(false)

  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  const domain = getDomain(url)
  
  const faviconUrl = domain 
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null

  if (faviconUrl && !faviconError && url.length > 10) {
    return (
      <div className="flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={faviconUrl}
            src={faviconUrl} 
            alt="Website icon"
            className={className}
            onError={() => setFaviconError(true)}
            style={{ objectFit: 'contain' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <Globe weight="duotone" className={className} />
    </div>
  )
}
