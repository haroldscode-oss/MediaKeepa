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
import { Footer } from "@/components/Footer"
import { LegalPage } from "@/pages/LegalPage"
import { Play, MusicNote, Image, DownloadSimple, CheckCircle, ClosedCaptioning } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

// Get API URL from environment variable (defaults to same-origin backend).
// When the UI is opened via http://localhost we still call the Flask server on 127.0.0.1
// to avoid conflicts with stray dev servers bound to IPv6 localhost.
const runtimeOrigin = window.location.origin
const isLocalhost = runtimeOrigin.includes("localhost")
const API_URL = import.meta.env.VITE_API_URL || (isLocalhost ? "http://127.0.0.1:5000" : runtimeOrigin)

type FormatType = "mp4" | "webm" | "mkv" | "mp3" | "m4a" | "flac" | "jpg" | "png" | "webp"
type Quality = "8K" | "4K" | "2K" | "1440p" | "1080p" | "720p" | "480p" | "360p" | "240p" | "144p"
type Bitrate = "320kbps" | "256kbps" | "192kbps" | "160kbps" | "128kbps" | "96kbps" | "64kbps"
type CaptionFormat = "txt" | "srt" | "vtt"
type Language = {
  code: string
  name: string
}

const VIDEO_FORMATS: FormatType[] = ["mp4", "webm", "mkv"]
const AUDIO_FORMATS: FormatType[] = ["mp3", "m4a", "flac"]
const IMAGE_FORMATS: FormatType[] = ["jpg", "png", "webp"]
const CAPTION_FORMATS: CaptionFormat[] = ["txt", "srt", "vtt"]
const QUALITY_OPTIONS: Quality[] = ["8K", "4K", "2K", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"]
const BITRATE_OPTIONS: Bitrate[] = ["320kbps", "256kbps", "192kbps", "160kbps", "128kbps", "96kbps", "64kbps"]

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
  const [sessionId, setSessionId] = useState<string | null>(null)
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
  
  // Ref to store the progress polling interval (fixes race condition)
  const pollIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (url.length > 10) {
      const timer = setTimeout(() => {
        fetchVideoInfo(url)
      }, 800)
      return () => clearTimeout(timer)
    } else if (url.length === 0 && videoInfo) {
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
      // Reset available qualities and bitrates to defaults
  setAvailableQualities(QUALITY_OPTIONS)
  setAvailableBitrates(BITRATE_OPTIONS)
    }
  }, [url])

  const fetchVideoInfo = async (videoUrl: string) => {
    setIsLoading(true)
    setError("")
    // Reset download states when fetching new video
    setDownloadComplete(false)
    setDownloadProgress(null)
    setSelectedFormat(null)
    setSelectedQuality(null)
    setSelectedBitrate(null)

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
          captions: data.captionData?.has_captions || false  // Set based on backend data
        })
        console.log('📋 Available tabs:', data.availableFormats)
        console.log('🎯 Media type:', data.mediaType)
      }
      
      // Set caption languages if available
      if (data.captionData?.has_captions && data.captionData.languages) {
        setAvailableLanguages(data.captionData.languages)
        console.log(`✓ Found ${data.captionData.languages.length} caption languages`)
      } else {
        setAvailableLanguages([])
        console.log('No captions available for this video')
      }

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
    } catch (err) {
      console.error('Error fetching video info:', err)
      setError(err instanceof Error ? err.message : "Failed to fetch media information. Please check the URL and try again.")
      toast.error("Failed to fetch media information")
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

  const handleTabChange = (value: string) => {
    // Reset download state when switching between Video/Audio/Image tabs
    setDownloadComplete(false)
    setDownloadProgress(null)
    setSelectedFormat(null)
    setSelectedQuality(null)
    setSelectedBitrate(null)
  }

  const handleDownload = async () => {
    if (!selectedFormat || !url) return
    
    setIsDownloading(true)
    setDownloadComplete(false)
    setDownloadProgress(null)
    
    try {
      console.log('Starting download:', { url, format: selectedFormat, quality: selectedQuality, bitrate: selectedBitrate })
      
      // Determine download type
  const isVideo = VIDEO_FORMATS.includes(selectedFormat)
  const isAudio = AUDIO_FORMATS.includes(selectedFormat)
      const downloadType = isVideo ? 'video' : isAudio ? 'audio' : 'thumbnail'
      
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
      setSessionId(newSessionId)
      
      console.log('Download started, session ID:', newSessionId)
      toast.success('Download started!')
      
      // Poll for progress updates
      pollDownloadProgress(newSessionId)
      
    } catch (err) {
      console.error('Download error:', err)
      toast.error(err instanceof Error ? err.message : 'Download failed')
      setIsDownloading(false)
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
          totalMB: totalMB || 100, // Default to 100 if not available
          speedMBps,
          timeRemainingSeconds,
        })
        
        // Check if complete (either 'complete' status or 'processing' with filename)
        if (status === 'complete' || (status === 'processing' && data.filename)) {
          if (pollIntervalRef.current !== null) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          console.log('Download complete! Full response:', data)
          
          setTimeout(async () => {
            setIsDownloading(false)
            setDownloadComplete(true)
            
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
                
                toast.success(`${videoInfo?.title || 'File'} downloaded successfully!`)
                
              } catch (err) {
                console.error('Download trigger error:', err)
                toast.error('Failed to download file')
              }
            } else {
              console.error('No filename in response! Response:', data)
              toast.error('Download completed but filename not found')
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
        console.error('Progress polling error:', err)
        toast.error('Download failed')
        setIsDownloading(false)
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

  const handleCaptionsClick = () => {
    // Languages are already loaded from video-info, no need to refetch
    setCaptionsSelected(true)
    setDownloadProgress(null)
    setDownloadComplete(false)
  }

  const handleCaptionDownload = async () => {
    if (!selectedLanguage || !url) return

    setIsDownloading(true)
    setDownloadProgress(null)
    setDownloadComplete(false)
    toast.success('Starting caption download...')

    try {
      // Start caption download
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
        // Poll for download progress
        const sessionId = data.session_id
        const pollInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`${API_URL}/download-progress/${sessionId}`)
            const progressData = await progressResponse.json()

            if (progressData.status === 'complete' && progressData.filename) {
              clearInterval(pollInterval)
              setDownloadComplete(true)
              toast.success('Caption downloaded!')

              // Download the file
              const fileUrl = `${API_URL}/get-file/${progressData.filename}`
              const link = document.createElement('a')
              link.href = fileUrl
              link.download = progressData.filename
              link.click()

              setIsDownloading(false)
            } else if (progressData.status === 'error') {
              clearInterval(pollInterval)
              toast.error(progressData.message || 'Caption download failed')
              setIsDownloading(false)
            } else {
              // Update progress
              setDownloadProgress(progressData.progress || 0)
            }
          } catch (error) {
            clearInterval(pollInterval)
            console.error('Error polling progress:', error)
            toast.error('Failed to check download progress')
            setIsDownloading(false)
          }
        }, 500) // Poll every 500ms

        // Set timeout to stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          if (isDownloading) {
            toast.error('Caption download timed out')
            setIsDownloading(false)
          }
        }, 120000)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error downloading caption:', error)
      toast.error('Failed to download caption')
      setIsDownloading(false)
    }
  }

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
          <div className="space-y-4">
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
                className="h-14 text-base pl-12 pr-5 border-2 focus-visible:ring-2 focus-visible:ring-accent"
              />
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
                className="space-y-8"
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
                  {canDownload && !isDownloading && !downloadComplete && (
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
                        Download {selectedFormat?.toUpperCase()}
                        {isVideoFormat && selectedQuality && ` (${selectedQuality})`}
                        {isAudioFormat && selectedBitrate && ` (${selectedBitrate})`}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(isDownloading || downloadComplete) && downloadProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      <Card className="p-6 border-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {downloadComplete && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                >
                                  <CheckCircle weight="fill" size={20} className="text-foreground" />
                                </motion.div>
                              )}
                              <span className="font-medium text-foreground">
                                {downloadComplete ? "Download Complete!" : "Downloading..."}
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {Math.round(downloadProgress.percentage)}%
                            </span>
                          </div>

                          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={downloadComplete 
                                ? "absolute inset-y-0 left-0 rounded-full bg-foreground"
                                : "absolute inset-y-0 left-0 rounded-full bg-foreground progress-bar-shimmer"
                              }
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${downloadProgress.percentage}%`
                              }}
                              transition={{ 
                                width: { duration: downloadComplete ? 0.3 : 0.1, ease: downloadComplete ? "easeOut" : "linear" }
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">File Size</p>
                              <p className="text-sm font-medium">
                                {downloadProgress.downloadedMB.toFixed(1)} MB / {downloadProgress.totalMB.toFixed(1)} MB
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {downloadComplete ? "Average Speed" : "Speed"}
                              </p>
                              <p className="text-sm font-medium">
                                {downloadProgress.speedMBps.toFixed(1)} MB/s
                              </p>
                            </div>
                            <div className="space-y-1 col-span-2">
                              <p className="text-xs text-muted-foreground">
                                {downloadComplete ? "Total Time" : "Time Remaining"}
                              </p>
                              <p className="text-sm font-medium">
                                {downloadComplete 
                                  ? `${Math.ceil(downloadProgress.timeRemainingSeconds)} seconds`
                                  : `${Math.ceil(downloadProgress.timeRemainingSeconds)} seconds left`
                                }
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
        <Toaster position="top-center" />
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