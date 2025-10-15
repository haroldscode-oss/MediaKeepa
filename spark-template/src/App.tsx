import { useState, useEffect } from "react"
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
import { Play, MusicNote, Image, DownloadSimple, CheckCircle } from "@phosphor-icons/react"
import { toast } from "sonner"

// Get API URL from environment variable (defaults to localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

type FormatType = "mp4" | "webm" | "mkv" | "mp3" | "m4a" | "flac" | "jpg" | "png" | "webp"
type Quality = "8K" | "4K" | "2K" | "1440p" | "1080p" | "720p" | "480p" | "360p" | "240p" | "144p"
type Bitrate = "320kbps" | "256kbps" | "192kbps" | "160kbps" | "128kbps" | "96kbps" | "64kbps"

type DownloadProgress = {
  percentage: number
  downloadedMB: number
  totalMB: number
  speedMBps: number
  timeRemainingSeconds: number
}

function App() {
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
    image: true
  })
  const [availableQualities, setAvailableQualities] = useState<Quality[]>(qualities)
  const [availableBitrates, setAvailableBitrates] = useState<Bitrate[]>(bitrates)

  const videoFormats: FormatType[] = ["mp4", "webm", "mkv"]
  const audioFormats: FormatType[] = ["mp3", "m4a", "flac"]
  const imageFormats: FormatType[] = ["jpg", "png", "webp"]

  const qualities: Quality[] = ["8K", "4K", "2K", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"]
  const bitrates: Bitrate[] = ["320kbps", "256kbps", "192kbps", "160kbps", "128kbps", "96kbps", "64kbps"]

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
      // Reset available qualities and bitrates to defaults
      setAvailableQualities(qualities)
      setAvailableBitrates(bitrates)
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
          image: data.availableFormats.image || false
        })
        console.log('📋 Available tabs:', data.availableFormats)
        console.log('🎯 Media type:', data.mediaType)
      }

      // Update available qualities and bitrates from backend
      if (data.availableQualities && data.availableQualities.length > 0) {
        setAvailableQualities(data.availableQualities)
        console.log('🎬 Available qualities:', data.availableQualities)
      } else {
        // Fallback to all qualities if none detected
        setAvailableQualities(qualities)
      }

      if (data.availableBitrates && data.availableBitrates.length > 0) {
        setAvailableBitrates(data.availableBitrates)
        console.log('🎵 Available bitrates:', data.availableBitrates)
      } else {
        // Fallback to all bitrates if none detected
        setAvailableBitrates(bitrates)
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
    
    if (videoFormats.includes(format)) {
      setSelectedQuality(null)
      setSelectedBitrate(null)
    } else if (audioFormats.includes(format)) {
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
      const isVideo = videoFormats.includes(selectedFormat)
      const isAudio = audioFormats.includes(selectedFormat)
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
    const interval = setInterval(async () => {
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
          clearInterval(interval)
          
          console.log('Download complete! Full response:', data)
          
          setTimeout(async () => {
            setIsDownloading(false)
            setDownloadComplete(true)
            
            // Trigger browser download
            if (data.filename) {
              try {
                console.log('Downloading file:', data.filename)
                const downloadUrl = `${API_URL}/get-file/${data.filename}`
                toast.success(`${videoInfo?.title || 'File'} downloaded successfully!`)
                
                // Use window.location to trigger download (more reliable than anchor click)
                window.location.href = downloadUrl
                
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
          clearInterval(interval)
          throw new Error(data.message || 'Download failed')
        }
        
      } catch (err) {
        clearInterval(interval)
        console.error('Progress polling error:', err)
        toast.error('Download failed')
        setIsDownloading(false)
      }
    }, 500) // Poll every 500ms
  }

  const isVideoFormat = selectedFormat && videoFormats.includes(selectedFormat)
  const isAudioFormat = selectedFormat && audioFormats.includes(selectedFormat)
  const isImageFormat = selectedFormat && imageFormats.includes(selectedFormat)
  const canDownload = selectedFormat && 
    ((isVideoFormat && selectedQuality) || 
     (isAudioFormat && selectedBitrate) || 
     isImageFormat)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center pt-4">
          <MediaKeepaLogo />
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
                    availableTabs.image ? "image" : 
                    "video"
                  } 
                  className="w-full"
                  onValueChange={handleTabChange}
                >
                  <TabsList className={`grid w-full h-12 ${
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
                  </TabsList>

                  <TabsContent value="video" className="space-y-6 mt-6">
                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                      {videoFormats.map((format) => (
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
                          <label className="text-sm font-medium text-muted-foreground">Quality</label>
                          <Select value={selectedQuality || ""} onValueChange={(v) => setSelectedQuality(v as Quality)}>
                            <SelectTrigger className="h-11 border-2 bg-card">
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
                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                      {audioFormats.map((format) => (
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
                          <label className="text-sm font-medium text-muted-foreground">Bitrate</label>
                          <Select value={selectedBitrate || ""} onValueChange={(v) => setSelectedBitrate(v as Bitrate)}>
                            <SelectTrigger className="h-11 border-2 bg-card">
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
                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                      {imageFormats.map((format) => (
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
    </div>
  )
}

export default App