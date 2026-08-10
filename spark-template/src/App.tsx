import { useState, useEffect, useRef } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { ShimmerText } from "@/components/ShimmerText"
import { FormatOption } from "@/components/FormatOption"
import { ThemeToggle } from "@/components/ThemeToggle"
import { MediaKeepaLogo } from "@/components/MediaKeepaLogo"
import { WebsiteIcon } from "@/components/WebsiteIcon"
import { RecentUrls, addRecentUrl } from "@/components/RecentUrls"
import { Footer } from "@/components/Footer"
import { LegalPage } from "@/pages/LegalPage"
import { Play, MusicNote, Image, DownloadSimple, ClosedCaptioning, CheckCircle, X } from "@phosphor-icons/react"
import { toast } from "sonner"

// Backend base URL detection.
// In dev we proxy API calls through Vite, so we fall back to relative paths (empty base).
const runtimeOrigin = window.location.origin
const runtimeUrl = new URL(runtimeOrigin)
const isLocalhost =
  runtimeUrl.hostname.includes("localhost") ||
  runtimeUrl.hostname === "127.0.0.1" ||
  runtimeUrl.hostname.endsWith(".local")
const resolvedHost = isLocalhost ? "127.0.0.1" : runtimeUrl.hostname
const devApiUrl = import.meta.env.VITE_DEV_API_URL
const defaultApiPort = import.meta.env.VITE_API_PORT || runtimeUrl.port || ""
const portSegment = defaultApiPort ? `:${defaultApiPort}` : ""
const productionBase = `${runtimeUrl.protocol}//${resolvedHost}${portSegment}`
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? devApiUrl || "" : productionBase)

type FormatType = "mp4" | "webm" | "mkv" | "mp3" | "m4a" | "flac" | "jpg" | "png" | "webp"
type Quality = "8K" | "4K" | "2K" | "1440p" | "1080p" | "720p" | "480p" | "360p" | "240p" | "144p"
type Bitrate = "320kbps" | "256kbps" | "192kbps" | "160kbps" | "128kbps" | "96kbps" | "64kbps"
type CaptionFormat = "txt" | "srt" | "vtt"
type Language = {
  code: string
  name: string
}

const VIDEO_FORMATS: FormatType[] = ["mp4", "mkv", "webm"]
const AUDIO_FORMATS: FormatType[] = ["mp3", "m4a", "flac"]
const IMAGE_FORMATS: FormatType[] = ["png", "jpg", "webp"]
const CAPTION_FORMATS: CaptionFormat[] = ["txt", "srt", "vtt"]
const QUALITY_OPTIONS: Quality[] = ["8K", "4K", "2K", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"]
const BITRATE_OPTIONS: Bitrate[] = ["320kbps", "256kbps", "192kbps", "160kbps", "128kbps", "96kbps", "64kbps"]
const POPULAR_LANGUAGE_CODES = ["en", "es", "hi", "pt", "ru", "ja", "de", "fr", "it", "ko"] as const

const selectTopLanguages = (languages: Language[]): Language[] => {
  if (!languages.length) {
    return []
  }

  const prioritized: Language[] = []
  const taken = new Set<string>()

  const normalize = (code: string) => {
    const lower = code.toLowerCase()
    const [base] = lower.split('-')
    return { lower, base }
  }

  for (const code of POPULAR_LANGUAGE_CODES) {
    const match = languages.find((lang) => {
      if (taken.has(lang.code)) {
        return false
      }
      const normalized = normalize(lang.code)
      return normalized.lower === code || normalized.base === code
    })

    if (match) {
      prioritized.push(match)
      taken.add(match.code)

      if (prioritized.length >= POPULAR_LANGUAGE_CODES.length) {
        break
      }
    }
  }

  if (prioritized.length === 0) {
    return languages.slice(0, POPULAR_LANGUAGE_CODES.length)
  }

  return prioritized
}

const TOAST_IDS = {
  videoInfoError: "video-info-error",
  downloadStart: "download-start",
  downloadComplete: "download-complete",
  downloadError: "download-error",
  progressError: "download-progress-error",
  captionChecking: "caption-checking",
  captionInfo: "caption-info",
  captionError: "caption-error",
  captionDownloadStart: "caption-download-start",
  captionDownloadError: "caption-download-error",
} as const

type VideoInfo = {
  title: string
  thumbnail: string
  duration: string
  channel: string
  mediaType?: "video" | "audio" | "image"
  availableFormats?: {
    video: boolean
    audio: boolean
    image: boolean
  }
  availableQualities?: Quality[]
  availableBitrates?: Bitrate[]
  extractor?: string
}

type DownloadProgress = {
  percentage: number
  downloadedMB: number
  totalMB: number
  speedMBps: number
  timeRemainingSeconds: number
}

function HomePage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<FormatType | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null)
  const [selectedBitrate, setSelectedBitrate] = useState<Bitrate | null>(null)
  const [error, setError] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [availableTabs, setAvailableTabs] = useState({
    video: true,
    audio: true,
    image: true,
    captions: true
  })
  const [availableQualities, setAvailableQualities] = useState<Quality[]>(QUALITY_OPTIONS)
  const [availableBitrates, setAvailableBitrates] = useState<Bitrate[]>(BITRATE_OPTIONS)
  const [selectedCaptionFormat, setSelectedCaptionFormat] = useState<CaptionFormat | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("")
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([])
  const [captionsSelected, setCaptionsSelected] = useState(false)
  const [isCheckingCaptions, setIsCheckingCaptions] = useState(false)
  const [activeDownloadType, setActiveDownloadType] = useState<"video" | "audio" | "image" | "caption" | null>(null)
  const [captionStatus, setCaptionStatus] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTotalMB, setEstimatedTotalMB] = useState(0)
  const [previousProgress, setPreviousProgress] = useState(0)
  const [previousTime, setPreviousTime] = useState(0)
  
  // Ref to store the progress polling interval (fixes race condition)
  const pollIntervalRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const elapsedTimerRef = useRef<number | null>(null)
  const completedSessionRef = useRef<string | null>(null)
  const downloadInFlightRef = useRef(false) // stops duplicate download firing

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${totalSeconds}.${milliseconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (url.length > 10) {
      const timer = setTimeout(() => {
        fetchVideoInfo(url)
      }, 800)
      return () => clearTimeout(timer)
    } else if (url.length === 0) {
      setVideoInfo(null)
      setSelectedFormat(null)
      setSelectedQuality(null)
      setSelectedBitrate(null)
      setDownloadComplete(false)
      setDownloadProgress(null)
      setAvailableLanguages([])
      setSelectedLanguage("")
      setSelectedCaptionFormat(null)
      setCaptionsSelected(false)
      setIsCheckingCaptions(false)
      setActiveDownloadType(null)
      setCaptionStatus("")
      // Reset available qualities and bitrates to defaults
      setAvailableQualities(QUALITY_OPTIONS)
      setAvailableBitrates(BITRATE_OPTIONS)
    }
  }, [url])

  // Cleanup interval on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (elapsedTimerRef.current !== null) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
  }, [])

  const handleClearUrl = () => {
    setUrl("")
    setError("")
    inputRef.current?.focus()
  }

  const handleRecentUrlSelect = (selectedUrl: string) => {
    if (selectedUrl === url) {
      fetchVideoInfo(selectedUrl)
    } else {
      setUrl(selectedUrl)
    }

    inputRef.current?.focus()
  }

  const fetchVideoInfo = async (videoUrl: string) => {
    setIsLoading(true)
    setError("")
    toast.dismiss(TOAST_IDS.videoInfoError)
    // Reset download states when fetching new video
    setDownloadComplete(false)
    setDownloadProgress(null)
    setSelectedFormat(null)
    setSelectedQuality(null)
    setSelectedBitrate(null)
    setIsCheckingCaptions(false)
    setActiveDownloadType(null)
    setSelectedCaptionFormat(null)
    setSelectedLanguage("")
    setCaptionsSelected(false)
    setAvailableLanguages([])
  setCaptionStatus("")

    try {
      console.log('Fetching video info from:', `${API_URL}/video-info`)
      
      const response = await fetch(`${API_URL}/video-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      })

      const data = await response.json()

      // Flask backend returns { status: "success", title: "...", thumbnail: "...", ... }
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to fetch media information')
      }

      // Update available tabs based on backend detection
      if (data.availableFormats) {
        setAvailableTabs({
          video: data.availableFormats.video || false,
          audio: data.availableFormats.audio || false,
          image: data.availableFormats.image || false,
          captions: true  // Always show Caption tab - check on-demand when user clicks
        })
        console.log('📋 Available tabs:', data.availableFormats)
        console.log('🎯 Media type:', data.mediaType)
      }
      
      // Reset caption state - will be loaded when user clicks Caption tab
  setAvailableLanguages([])
  setSelectedCaptionFormat(null)
  setSelectedLanguage("")
  setCaptionsSelected(false)
      console.log('Caption tab will be checked on-demand when user clicks it')

      // ALWAYS show ALL qualities and bitrates regardless of detection
      // This gives users maximum choice and flexibility
      setAvailableQualities(QUALITY_OPTIONS)
      setAvailableBitrates(BITRATE_OPTIONS)
      
      // Log what was detected (for debugging) but don't limit the UI
      if (data.availableQualities && data.availableQualities.length > 0) {
        console.log('🎬 Detected qualities:', data.availableQualities, '(but showing all options)')
      }
      if (data.availableBitrates && data.availableBitrates.length > 0) {
        console.log('🎵 Detected bitrates:', data.availableBitrates, '(but showing all options)')
      }

      // Flask backend returns the data directly (not nested in data.data)
      setVideoInfo({
        title: data.title || 'Untitled Video',
        // If thumbnail starts with /, it's a local path, prepend API_URL
        // Otherwise it's a direct URL (YouTube, etc.)
        thumbnail: data.thumbnail?.startsWith('/') 
          ? `${API_URL}${data.thumbnail}` 
          : (data.thumbnail || 'https://via.placeholder.com/800x450'),
        duration: data.duration || 'Unknown',
        channel: data.uploader || 'Unknown',
        mediaType: data.mediaType,
        availableFormats: data.availableFormats,
        availableQualities: data.availableQualities,
        availableBitrates: data.availableBitrates,
        extractor: data.extractor
      })

      console.log('Video info loaded successfully:', data.title)

      addRecentUrl({
        url: videoUrl,
        title: data.title || 'Untitled Video'
      })
    } catch (err) {
      console.error('Error fetching video info:', err)
      setError(err instanceof Error ? err.message : "Failed to fetch media information. Please check the URL and try again.")
      toast.error("Failed to fetch media information", {
        id: TOAST_IDS.videoInfoError,
      })
      setVideoInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormatSelect = (format: FormatType) => {
    setSelectedFormat(format)
    // Reset download complete state when user changes format
    setDownloadComplete(false)
    setDownloadProgress(null)
    setActiveDownloadType(null)
    
    if (VIDEO_FORMATS.includes(format)) {
      setSelectedQuality(null)
      setSelectedBitrate(null)
    } else if (AUDIO_FORMATS.includes(format)) {
      setSelectedBitrate(null)
      setSelectedQuality(null)
    } else {
      setSelectedQuality("1080p")
      setSelectedBitrate(null)
    }
  }

  const handleTabChange = () => {
    // Reset download state when switching tabs
    setDownloadComplete(false)
    setDownloadProgress(null)
    setSelectedFormat(null)
    setSelectedQuality(null)
    setSelectedBitrate(null)
    setActiveDownloadType(null)
    setIsCheckingCaptions(false)

    // Clear caption-specific selections when navigating between tabs
    setCaptionsSelected(false)
    setSelectedCaptionFormat(null)
    setSelectedLanguage("")
    setAvailableLanguages([])
    setCaptionStatus("")
  }

  const handleDownload = async () => {
    if (!selectedFormat || !url) return

    if (downloadInFlightRef.current) {
      return
    }
    downloadInFlightRef.current = true

    completedSessionRef.current = null
    
    const isVideo = VIDEO_FORMATS.includes(selectedFormat)
    const isAudio = AUDIO_FORMATS.includes(selectedFormat)
    const downloadType = isVideo ? 'video' : isAudio ? 'audio' : 'thumbnail'
    const uiDownloadType: "video" | "audio" | "image" = isVideo ? 'video' : isAudio ? 'audio' : 'image'

  setError("")
    setIsCheckingCaptions(false)
    setIsDownloading(true)
    setDownloadComplete(false)
    setDownloadProgress(null)
    setActiveDownloadType(uiDownloadType)
    setElapsedTime(0)
    setPreviousProgress(0)
    setPreviousTime(0)
    toast.dismiss(TOAST_IDS.downloadError)
    toast.dismiss(TOAST_IDS.downloadComplete)
    toast.dismiss(TOAST_IDS.downloadStart)
    
    // Set a random but consistent total file size for this download
    setEstimatedTotalMB(25 + Math.random() * 75)
    
    // Clear any existing elapsed timer and start new one
    if (elapsedTimerRef.current !== null) {
      clearInterval(elapsedTimerRef.current)
    }
    
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 10)
    }, 10)
    
    try {
      console.log('Starting download:', { url, format: selectedFormat, quality: selectedQuality, bitrate: selectedBitrate })
      
      // Start download
      const response = await fetch(`${API_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          format: selectedFormat,
          quality: isVideo ? selectedQuality : undefined,
          bitrate: isAudio ? selectedBitrate : undefined,
          download_type: downloadType,
        }),
      })

      const data = await response.json()

      // Flask backend returns { status: "started", session_id: "..." }
      if (!response.ok || data.status !== 'started') {
        throw new Error(data.message || 'Download failed')
      }

      const newSessionId = data.session_id
      completedSessionRef.current = null
      
      console.log('Download started, session ID:', newSessionId)
      toast.success('Download started!', {
        id: TOAST_IDS.downloadStart,
        duration: 2000,
      })
      
      // Poll for progress updates
      pollDownloadProgress(newSessionId)
      
    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : 'Download failed')
      toast.dismiss(TOAST_IDS.downloadStart)
      toast.error(err instanceof Error ? err.message : 'Download failed', {
        id: TOAST_IDS.downloadError,
      })
      setIsDownloading(false)
      setActiveDownloadType(null)
      setDownloadProgress(null)
      downloadInFlightRef.current = false
      if (elapsedTimerRef.current !== null) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
  }

  const pollDownloadProgress = async (sid: string) => {
    // Clear any existing interval before starting a new one (fixes race condition)
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current)
    }
    
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/download-progress/${sid}`)
        
        // If session not found (404), the download may have completed and been cleaned up
        if (!response.ok && response.status === 404) {
          console.log('Session not found - download may have completed')
          // Just stop polling, don't show error
          if (pollIntervalRef.current !== null) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          if (elapsedTimerRef.current !== null) {
            clearInterval(elapsedTimerRef.current)
            elapsedTimerRef.current = null
          }
          downloadInFlightRef.current = false
          return
        }
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error('Failed to get progress')
        }

        // Parse progress data
        const progress = parseFloat(data.progress) || 0
        const status = data.status
        
    // Extract file size info
    let downloadedMB = 0
    let totalMB = 0
    let speedMBps = 0
        
        if (data.file_size) {
          // Parse "12.5 MB / 25.0 MB" format
          const sizeMatch = data.file_size.match(/([\d.]+)\s*MB\s*\/\s*([\d.]+)\s*MB/)
          if (sizeMatch) {
            downloadedMB = parseFloat(sizeMatch[1])
            totalMB = parseFloat(sizeMatch[2])
          }
        }
        
        if (data.speed) {
          // Parse "2.5 MB/s" format
          const speedMatch = data.speed.match(/([\d.]+)\s*MB/)
          if (speedMatch) {
            speedMBps = parseFloat(speedMatch[1])
          }
        }
        
        // Parse ETA
        let timeRemainingSeconds = 0
        if (data.eta && data.eta !== 'Unknown') {
          const etaMatch = data.eta.match(/(\d+)s/)
          if (etaMatch) {
            timeRemainingSeconds = parseInt(etaMatch[1])
          }
        }
        
        // Update progress
        setDownloadProgress({
          percentage: progress,
          downloadedMB,
          totalMB,
          speedMBps,
          timeRemainingSeconds,
        })
        
        // Check if complete (either 'complete' status or 'processing' with filename)
        if (status === 'complete' || (status === 'processing' && data.filename)) {
          if (pollIntervalRef.current !== null) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          if (elapsedTimerRef.current !== null) {
            clearInterval(elapsedTimerRef.current)
            elapsedTimerRef.current = null
          }
          
          if (completedSessionRef.current === sid) {
            return
          }
          completedSessionRef.current = sid

          console.log('Download complete! Full response:', data)

          const finishedType = activeDownloadType
          
          setTimeout(() => {
            setIsDownloading(false)
            setDownloadComplete(true)
            setActiveDownloadType(null)
            downloadInFlightRef.current = false
            if (finishedType === 'caption') {
              toast.dismiss(TOAST_IDS.captionDownloadStart)
              setCaptionStatus('Caption downloaded successfully!')
            }
            
            // Show success toast notification
            toast.dismiss(TOAST_IDS.downloadStart)
            toast.dismiss(TOAST_IDS.downloadError)
            toast.success('Download Complete!', {
              id: TOAST_IDS.downloadComplete,
              description: 'Your file has been downloaded successfully.',
              duration: 4000,
            })
            
            // Trigger browser download
            if (data.filename) {
              try {
                console.log('Downloading file:', data.filename)
                const downloadUrl = `${API_URL}/get-file/${data.filename}`
                
                // Create a hidden anchor element to trigger download without navigation
                const link = document.createElement('a')
                link.href = downloadUrl
                link.download = data.filename.split('_', 1)[1] || data.filename // Remove session_id prefix
                link.style.display = 'none'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              } catch (err) {
                console.error('Download trigger error:', err)
                setError('Failed to download file')
                toast.error('Download Failed', {
                  id: TOAST_IDS.downloadError,
                  description: 'Failed to download file. Please try again.',
                  duration: 4000,
                })
                if (finishedType === 'caption') {
                  setCaptionStatus('Failed to download caption file')
                }
              }
            } else {
              console.error('No filename in response! Response:', data)
              setError('Download completed but filename not found')
              toast.error('Download Error', {
                id: TOAST_IDS.downloadError,
                description: 'Download completed but filename not found.',
                duration: 4000,
              })
              if (finishedType === 'caption') {
                setCaptionStatus('Download completed but caption file was not found')
              }
            }
          }, 500)
        }
        
        // Check for errors
        if (status === 'error') {
          if (pollIntervalRef.current !== null) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          throw new Error(data.message || 'Download failed')
        }
        
      } catch (err) {
        if (pollIntervalRef.current !== null) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        if (elapsedTimerRef.current !== null) {
          clearInterval(elapsedTimerRef.current)
          elapsedTimerRef.current = null
        }
        console.error('Progress polling error:', err)
        const failedType = activeDownloadType
        setError(err instanceof Error ? err.message : 'Download failed')
        toast.dismiss(TOAST_IDS.downloadStart)
        toast.error('Download Failed', {
          id: TOAST_IDS.progressError,
          description: err instanceof Error ? err.message : 'Download failed. Please try again.',
          duration: 4000,
        })
        if (failedType === 'caption') {
          setCaptionStatus('Failed to download caption')
        }
        setIsDownloading(false)
        setActiveDownloadType(null)
        downloadInFlightRef.current = false
      }
    }, 500) // Poll every 500ms
  }

  const isVideoFormat = selectedFormat && VIDEO_FORMATS.includes(selectedFormat)
  const isAudioFormat = selectedFormat && AUDIO_FORMATS.includes(selectedFormat)
  const isImageFormat = selectedFormat && IMAGE_FORMATS.includes(selectedFormat)
  const canDownload = selectedFormat && 
    ((isVideoFormat && selectedQuality) || 
     (isAudioFormat && selectedBitrate) || 
     isImageFormat)
  const shouldShowRecentUrls = !url && !isLoading && !videoInfo && isInputFocused
  const canStartDownload = Boolean(canDownload && !isDownloading)

  const handleCaptionsClick = async () => {
    setCaptionsSelected(true)
    setDownloadProgress(null)
    setDownloadComplete(false)
    setActiveDownloadType(null)
    toast.dismiss(TOAST_IDS.captionError)
    toast.dismiss(TOAST_IDS.captionInfo)
    toast.dismiss(TOAST_IDS.captionChecking)

    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    // If languages already loaded, skip the check
    if (availableLanguages.length > 0) {
      console.log('Caption languages already loaded')
      setIsCheckingCaptions(false)
      setCaptionStatus('Caption languages already loaded.')
      return
    }
    
    // Start caption check with progress feedback
    setIsCheckingCaptions(true)
    setSelectedLanguage("")
    setCaptionStatus('Checking for captions...')
    toast.info('Checking for captions...', {
      id: TOAST_IDS.captionChecking,
      duration: 2000,
    })
    
    try {
      console.log('Starting caption check for:', url)
      
      const response = await fetch(`${API_URL}/check-captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start caption check')
      }
      
      const data = await response.json()
      
      if (data.status === 'started' && data.session_id) {
        console.log('Caption check started, session ID:', data.session_id)
        
        // Poll for progress (same pattern as video downloads!)
        const sessionId = data.session_id
        
        // Clear any existing interval
        if (pollIntervalRef.current !== null) {
          clearInterval(pollIntervalRef.current)
        }
        
        pollIntervalRef.current = window.setInterval(async () => {
          try {
            const progressResponse = await fetch(`${API_URL}/download-progress/${sessionId}`)
            const progressData = await progressResponse.json()
            
            if (!progressResponse.ok) {
              throw new Error('Failed to get caption check progress')
            }
            
            // Update progress display
            const progress = parseFloat(progressData.progress) || 0
            setDownloadProgress({
              percentage: progress,
              downloadedMB: 0,
              totalMB: 0,
              speedMBps: 0,
              timeRemainingSeconds: 0
            })
            
            console.log(`Caption check progress: ${progress}% - ${progressData.message}`)
            
            // Check if complete
            if (progressData.status === 'complete') {
              if (pollIntervalRef.current !== null) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              
              setIsCheckingCaptions(false)
              setDownloadProgress(null)
              toast.dismiss(TOAST_IDS.captionChecking)
              
              if (progressData.has_captions && progressData.languages) {
                const topLanguages = selectTopLanguages(progressData.languages)
                setAvailableLanguages(topLanguages)
                if (topLanguages.length > 0) {
                  const languageCount = topLanguages.length
                  const message = `Found ${languageCount} caption language${languageCount > 1 ? 's' : ''}!`
                  setCaptionStatus(`Found ${languageCount} caption language${languageCount > 1 ? 's' : ''}.`)
                  toast.success(message, {
                    id: TOAST_IDS.captionInfo,
                    duration: 3000,
                  })
                  console.log(`✓ Showing top languages:`, topLanguages.map((lang) => lang.code))
                } else {
                  setCaptionStatus('Captions available, but none match the language list.')
                  console.log('✗ Captions found but no languages matched')
                }
              } else {
                setAvailableLanguages([])
                setCaptionStatus('No captions available for this video.')
                toast.info('No captions available for this video', {
                  id: TOAST_IDS.captionInfo,
                  duration: 3000,
                })
                console.log('✗ No captions found')
              }
            }
            
            // Check for errors
            if (progressData.status === 'error') {
              if (pollIntervalRef.current !== null) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              throw new Error(progressData.message || 'Caption check failed')
            }
            
          } catch (err) {
            if (pollIntervalRef.current !== null) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            console.error('Caption check polling error:', err)
            setCaptionStatus('Failed to check captions. Please try again.')
            toast.error('Failed to check captions', {
              id: TOAST_IDS.captionError,
            })
            toast.dismiss(TOAST_IDS.captionChecking)
            setIsCheckingCaptions(false)
            setDownloadProgress(null)
          }
        }, 500) // Poll every 500ms
        
      } else {
        throw new Error('Invalid response from server')
      }
      
    } catch (err) {
      console.error('Error starting caption check:', err)
      setCaptionStatus(err instanceof Error ? err.message : 'Failed to check captions')
      toast.error(err instanceof Error ? err.message : 'Failed to check captions', {
        id: TOAST_IDS.captionError,
      })
        toast.dismiss(TOAST_IDS.captionChecking)
      setIsCheckingCaptions(false)
      setDownloadProgress(null)
    }
  }

  const handleCaptionDownload = async () => {
    if (!selectedLanguage || !url || !selectedCaptionFormat) return

    if (downloadInFlightRef.current) {
      return
    }
    downloadInFlightRef.current = true
    completedSessionRef.current = null

    setIsCheckingCaptions(false)
    setIsDownloading(true)
    setDownloadProgress(null)
    setDownloadComplete(false)
    setActiveDownloadType('caption')
    setCaptionStatus('Starting caption download...')
    toast.dismiss(TOAST_IDS.captionDownloadError)
    toast.dismiss(TOAST_IDS.captionDownloadStart)
    toast.info('Starting caption download...', {
      id: TOAST_IDS.captionDownloadStart,
      duration: 2000,
    })
    setElapsedTime(0)
    setPreviousProgress(0)
    setPreviousTime(0)
    
    // Set a random but consistent total file size for this download (captions are smaller)
    setEstimatedTotalMB(0.5 + Math.random() * 2)
    
    // Clear any existing elapsed timer and start new one
    if (elapsedTimerRef.current !== null) {
      clearInterval(elapsedTimerRef.current)
    }
    
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 10)
    }, 10)

    try {
      const response = await fetch(`${API_URL}/download-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          language: selectedLanguage,
          format: selectedCaptionFormat
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start caption download')
      }

      const data = await response.json()

      if (data.status === 'started' && data.session_id) {
        const newSessionId = data.session_id
        completedSessionRef.current = null
        pollDownloadProgress(newSessionId)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error downloading caption:', error)
      setCaptionStatus(error instanceof Error ? error.message : 'Failed to download caption')
      setError(error instanceof Error ? error.message : 'Failed to download caption')
      toast.dismiss(TOAST_IDS.captionDownloadStart)
      toast.error('Failed to download caption', {
        id: TOAST_IDS.captionDownloadError,
      })
      setIsDownloading(false)
      setIsCheckingCaptions(false)
      setActiveDownloadType(null)
      setDownloadProgress(null)
      downloadInFlightRef.current = false
      if (elapsedTimerRef.current !== null) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
  }

  const progressPercentage = downloadProgress?.percentage ?? 0
  const progressDisplay = Number.isFinite(progressPercentage) ? Math.round(progressPercentage) : 0
  
  // Use stored total MB (set once at download start)
  const downloadedMB = (progressPercentage / 100) * estimatedTotalMB
  const sizeDisplay = downloadProgress && estimatedTotalMB > 0
    ? `${downloadedMB.toFixed(1)} MB / ${estimatedTotalMB.toFixed(1)} MB`
    : 'Calculating...'
  
  // Calculate accurate speed based on progress change over time
  const elapsedSeconds = elapsedTime / 1000
  const progressDelta = progressPercentage - previousProgress
  const timeDelta = (elapsedTime - previousTime) / 1000
  
  // Calculate instantaneous speed based on recent progress change
  let speedMBps = 0
  if (timeDelta > 0.5 && progressDelta > 0) {
    // Speed = (change in MB) / (change in time)
    const mbDelta = (progressDelta / 100) * estimatedTotalMB
    speedMBps = mbDelta / timeDelta
    // Update previous values for next calculation
    setPreviousProgress(progressPercentage)
    setPreviousTime(elapsedTime)
  } else if (elapsedSeconds > 0 && downloadedMB > 0) {
    // Fallback to average speed if no recent delta
    speedMBps = downloadedMB / elapsedSeconds
  }
  
  const speedDisplay = speedMBps > 0.01
    ? `${speedMBps.toFixed(2)} MB/s`
    : '—'
  
  // Use elapsed time instead of remaining time
  const etaDisplay = formatElapsedTime(elapsedTime)
  
  const captionStatusTone = captionStatus
    ? /fail|error|missing|not found/i.test(captionStatus)
      ? 'error'
      : 'info'
    : null

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <MediaKeepaLogo />
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-8 pb-8"
      >
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                <WebsiteIcon 
                  url={url} 
                  className="w-5 h-5 text-muted-foreground transition-colors duration-200 flex-shrink-0"
                />
              </div>
              <Input
                type="text"
                placeholder="Paste video URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                ref={inputRef}
                className="h-14 text-base pl-12 pr-12 border-2 focus-visible:border-input focus-visible:ring-0"
              />
              {url && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Clear URL"
                >
                  <X size={16} weight="bold" />
                </button>
              )}
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
            <AnimatePresence>
              {shouldShowRecentUrls && (
                <RecentUrls onUrlSelect={handleRecentUrlSelect} />
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center py-12"
              >
                <ShimmerText text="Fetching media information..." />
              </motion.div>
            )}

            {!isLoading && videoInfo && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <Card className="overflow-hidden border-2">
                  <div className="flex flex-col sm:flex-row gap-4 p-5">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full sm:w-40 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1 space-y-1">
                      <h2 className="font-semibold text-lg leading-snug">{videoInfo.title}</h2>
                      <p className="text-sm text-muted-foreground">{videoInfo.channel}</p>
                      <p className="text-xs text-muted-foreground">{videoInfo.duration}</p>
                    </div>
                  </div>
                </Card>

                <Tabs 
                  defaultValue={
                    availableTabs.video ? "video" : 
                    availableTabs.audio ? "audio" : 
                    availableTabs.captions ? "captions" :
                    availableTabs.image ? "image" : 
                    "video"
                  } 
                  className="w-full"
                  onValueChange={handleTabChange}
                >
                  <TabsList className={`grid w-full h-12 ${
                    Object.values(availableTabs).filter(Boolean).length === 4 ? 'grid-cols-4' :
                    Object.values(availableTabs).filter(Boolean).length === 3 ? 'grid-cols-3' :
                    Object.values(availableTabs).filter(Boolean).length === 2 ? 'grid-cols-2' :
                    'grid-cols-1'
                  }`}>
                    {availableTabs.video && (
                      <TabsTrigger value="video" className="text-sm font-medium">Video</TabsTrigger>
                    )}
                    {availableTabs.audio && (
                      <TabsTrigger value="audio" className="text-sm font-medium">Audio</TabsTrigger>
                    )}
                    {availableTabs.image && (
                      <TabsTrigger value="image" className="text-sm font-medium">Image</TabsTrigger>
                    )}
                    {availableTabs.captions && (
                      <TabsTrigger value="captions" className="text-sm font-medium">Caption</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="video" className="space-y-6 mt-6">
                    <div className="grid grid-cols-3 gap-3">
                      {VIDEO_FORMATS.map((format) => (
                        <FormatOption
                          key={format}
                          label={format.toUpperCase()}
                          selected={selectedFormat === format}
                          onClick={() => handleFormatSelect(format)}
                          icon={<Play weight="fill" />}
                        />
                      ))}
                    </div>

                    <AnimatePresence>
                      {isVideoFormat && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-medium">Select Quality</label>
                          <Select value={selectedQuality || ""} onValueChange={(v) => setSelectedQuality(v as Quality)}>
                            <SelectTrigger className="w-full h-11 border-2">
                              <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableQualities.map((quality) => (
                                <SelectItem key={quality} value={quality}>
                                  {quality}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="audio" className="space-y-6 mt-6">
                    <div className="grid grid-cols-3 gap-3">
                      {AUDIO_FORMATS.map((format) => (
                        <FormatOption
                          key={format}
                          label={format.toUpperCase()}
                          selected={selectedFormat === format}
                          onClick={() => handleFormatSelect(format)}
                          icon={<MusicNote weight="fill" />}
                        />
                      ))}
                    </div>

                    <AnimatePresence>
                      {isAudioFormat && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-medium">Select Bitrate</label>
                          <Select value={selectedBitrate || ""} onValueChange={(v) => setSelectedBitrate(v as Bitrate)}>
                            <SelectTrigger className="w-full h-11 border-2">
                              <SelectValue placeholder="Select bitrate" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBitrates.map((bitrate) => (
                                <SelectItem key={bitrate} value={bitrate}>
                                  {bitrate}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="image" className="space-y-6 mt-6">
                    <div className="grid grid-cols-3 gap-3">
                      {IMAGE_FORMATS.map((format) => (
                        <FormatOption
                          key={format}
                          label={format.toUpperCase()}
                          selected={selectedFormat === format}
                          onClick={() => handleFormatSelect(format)}
                          icon={<Image weight="fill" />}
                        />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="captions" className="space-y-6 mt-6">
                    <div className="grid grid-cols-3 gap-3">
                      {CAPTION_FORMATS.map((format) => (
                        <FormatOption
                          key={format}
                          label={format.toUpperCase()}
                          selected={selectedCaptionFormat === format}
                          onClick={() => {
                            handleCaptionsClick()
                            setSelectedCaptionFormat(format)
                          }}
                          icon={<ClosedCaptioning weight="fill" />}
                        />
                      ))}
                    </div>

                    <AnimatePresence>
                      {captionsSelected && selectedCaptionFormat && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select Language</label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                              <SelectTrigger className="w-full h-11 border-2">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableLanguages.map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                            {captionStatus && (
                              <p className={`text-sm ${captionStatusTone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {captionStatus}
                              </p>
                            )}

                          {selectedLanguage && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <Button
                                variant="outline"
                                onClick={handleCaptionDownload}
                                disabled={!selectedLanguage || isDownloading}
                                className="w-full h-12 text-base font-semibold border-2 border-border hover:border-muted-foreground hover:bg-muted/50 text-foreground hover:text-foreground transition-all duration-200"
                                size="lg"
                              >
                                <DownloadSimple className="mr-2 shrink-0" weight="bold" size={20} />
                                <span className="truncate">Download Caption ({selectedCaptionFormat?.toUpperCase()})</span>
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                </Tabs>

                <AnimatePresence>
                  {canStartDownload && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="w-full h-12 text-base font-semibold border-2 border-border hover:border-muted-foreground hover:bg-muted/50 text-foreground hover:text-foreground transition-all duration-200"
                        size="lg"
                      >
                        <DownloadSimple className="mr-2" weight="bold" size={20} />
                        {downloadComplete ? 'Download Again' : 'Download'}{' '}
                        {selectedFormat?.toUpperCase()}
                        {isVideoFormat && selectedQuality && ` (${selectedQuality})`}
                        {isAudioFormat && selectedBitrate && ` (${selectedBitrate})`}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isCheckingCaptions && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-center py-8"
                    >
                      <ShimmerText text="Checking for captions..." />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(isDownloading || downloadComplete) && !isCheckingCaptions && downloadProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.25 }}
                      className="py-6"
                    >
                      <Card className="border-2 bg-background/80 shadow-sm">
                        <div className="space-y-4 p-6">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {downloadComplete && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                >
                                  <CheckCircle weight="fill" size={24} className="text-foreground" />
                                </motion.div>
                              )}
                              <p className="text-base font-semibold leading-tight">
                                {downloadComplete 
                                  ? 'Download Complete!' 
                                  : !downloadProgress 
                                    ? 'Starting...' 
                                    : progressDisplay >= 99 
                                      ? 'Finalizing...' 
                                      : 'Downloading...'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-base font-semibold">{progressDisplay}%</span>
                              {downloadComplete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-muted -mr-2"
                                  onClick={() => {
                                    setDownloadComplete(false)
                                    setDownloadProgress(null)
                                  }}
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-foreground rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercentage}%` }}
                              transition={{
                                duration: 0.3,
                                ease: [0.25, 0.1, 0.25, 1]
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground text-xs">File Size</p>
                              <p className="font-semibold text-foreground">{sizeDisplay}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground text-xs">
                                {downloadComplete ? "Average Speed" : "Speed"}
                              </p>
                              <p className="font-semibold text-foreground">{speedDisplay}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground text-xs">
                                {downloadComplete ? "Total Time" : "Elapsed Time"}
                              </p>
                              <p className="font-semibold text-foreground">{etaDisplay}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground text-xs">Current Status</p>
                              <p className="font-semibold text-foreground">
                                {downloadComplete 
                                  ? 'Download Complete!' 
                                  : !downloadProgress 
                                    ? 'Starting...' 
                                    : progressDisplay >= 99 
                                      ? 'Finalizing...' 
                                      : 'Downloading...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 px-4 py-6 sm:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/legal/:page" element={<LegalPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  )
}

export default App
