import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { ErrorBoundary } from "react-error-boundary";
import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { Toaster } from "@/components/ui/sonner"
import { useIsMobile } from "@/hooks/use-mobile"

import "./main.css"
import "./styles/theme.css"
import "./index.css"

function Root() {
  const isMobile = useIsMobile()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch((error) => console.warn('Service worker cleanup failed', error))
    }
  }, [])
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
      <Toaster position={isMobile ? "top-center" : "bottom-right"} />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
