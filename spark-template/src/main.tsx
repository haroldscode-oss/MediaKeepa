import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { Toaster } from "@/components/ui/sonner"
import { useIsMobile } from "@/hooks/use-mobile"

import "./main.css"
import "./styles/theme.css"
import "./index.css"

function Root() {
  const isMobile = useIsMobile()
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
      <Toaster position={isMobile ? "top-center" : "bottom-right"} />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
