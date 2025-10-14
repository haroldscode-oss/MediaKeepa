import { Globe } from "@phosphor-icons/react"
import { useState } from "react"

type WebsiteIconProps = {
  url: string
  className?: string
}

export function WebsiteIcon({ url, className = "" }: WebsiteIconProps) {
  const [faviconError, setFaviconError] = useState(false)

  // Extract domain from URL
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  const domain = getDomain(url)
  
  // Use Google's favicon service to fetch any website's icon
  const faviconUrl = domain 
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null

  // If we have a valid URL and favicon hasn't errored, show the favicon
  if (faviconUrl && !faviconError && url.length > 10) {
    return (
      <div className="flex items-center justify-center">
        <img 
          src={faviconUrl} 
          alt="Website icon"
          className={className}
          onError={() => setFaviconError(true)}
          style={{ objectFit: 'contain' }}
        />
      </div>
    )
  }

  // Fallback to globe icon
  return (
    <div className="flex items-center justify-center">
      <Globe weight="duotone" className={className} />
    </div>
  )
}
