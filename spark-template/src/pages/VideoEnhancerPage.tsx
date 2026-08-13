import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowClockwise,
  CheckCircle,
  DownloadSimple,
  FilmSlate,
  Pause,
  Play,
  Sparkle,
  X,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MAX_VIDEO_BYTES = 512 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ["mp4", "mov", "m4v", "mkv", "webm"]

type OutputMode = "original" | "1080p" | "1440p" | "4k"
type EnhancementJob = {
  status: "queued" | "processing" | "completed" | "error"
  progress: number
  message: string
  preview_url?: string
  download_url?: string
  estimated_cost?: number
  width?: number
  height?: number
}

type ComputeAccount = {
  connected?: boolean
  health?: string
  setupStatus?: "setting-up" | "ready" | "failed" | "outdated"
  apps?: Array<Record<string, unknown>>
  setupTools?: Record<string, string>
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text()
  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(`The server returned an unexpected response (${response.status}).`)
  }
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const seconds = Math.floor(value % 60).toString().padStart(2, "0")
  const minutes = Math.floor(value / 60)
  if (minutes < 60) return `${minutes}:${seconds}`
  return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, "0")}:${seconds}`
}

function isAcceptedVideo(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || ""
  return ACCEPTED_EXTENSIONS.includes(extension)
}

function targetDimensions(mode: OutputMode, width: number, height: number) {
  if (!width || !height || mode === "original") return { width, height }
  const targetShortEdge = mode === "1080p" ? 1080 : mode === "1440p" ? 1440 : 2160
  const ratio = Math.max(width, height) / Math.min(width, height)
  const shortEdge = Math.min(targetShortEdge, Math.round(3840 / ratio))
  const longEdge = Math.min(3840, Math.round(shortEdge * ratio))
  if (width >= height) {
    return { width: longEdge, height: shortEdge }
  }
  return { width: shortEdge, height: longEdge }
}

function useEnhancementPoll(
  jobId: string | null,
  job: EnhancementJob | null,
  setJob: (job: EnhancementJob) => void,
  completedMessage: string,
) {
  useEffect(() => {
    if (!jobId || job?.status === "completed" || job?.status === "error") return
    let cancelled = false
    const poll = async () => {
      try {
        const response = await fetch(`/api/video-enhancer/status/${jobId}`, { cache: "no-store" })
        const payload = await readApiResponse<EnhancementJob>(response)
        if (!response.ok) throw new Error(payload.message || "Could not read enhancement progress.")
        if (cancelled) return
        setJob(payload)
        if (payload.status === "completed") {
          toast.success(completedMessage)
          return
        }
        if (payload.status === "error") {
          toast.error(payload.message)
          return
        }
        window.setTimeout(poll, 1200)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : "Could not read enhancement progress."
        setJob({ status: "error", progress: 0, message })
        toast.error(message)
      }
    }
    const timer = window.setTimeout(poll, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [completedMessage, job?.status, jobId, setJob])
}

export function VideoEnhancerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [originalFrameUrl, setOriginalFrameUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState({ duration: 0, width: 0, height: 0 })
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [outputMode, setOutputMode] = useState<OutputMode>("original")
  const [previewJobId, setPreviewJobId] = useState<string | null>(null)
  const [previewJob, setPreviewJob] = useState<EnhancementJob | null>(null)
  const [fullJobId, setFullJobId] = useState<string | null>(null)
  const [fullJob, setFullJob] = useState<EnhancementJob | null>(null)
  const [uploading, setUploading] = useState<"preview" | "full" | null>(null)
  const [computeReady, setComputeReady] = useState<boolean | null>(null)

  const setPreview = useCallback((job: EnhancementJob) => setPreviewJob(job), [])
  const setFull = useCallback((job: EnhancementJob) => setFullJob(job), [])
  useEnhancementPoll(previewJobId, previewJob, setPreview, "Enhanced preview ready")
  useEnhancementPoll(fullJobId, fullJob, setFull, "Maximum Quality video ready")

  useEffect(() => {
    let cancelled = false
    const loadComputeReadiness = async () => {
      try {
        const response = await fetch("/compute/api/status", { cache: "no-store" })
        const payload = await readApiResponse<{ accounts?: ComputeAccount[] }>(response)
        if (!response.ok) throw new Error("Compute unavailable")
        const ready = (payload.accounts || []).some((account) => {
          if (!account.connected || ["setting-up", "failed", "outdated"].includes(account.setupStatus || "")) return false
          return account.setupTools?.["enhance-video"] === "ready"
            || (account.apps || []).some((app) => JSON.stringify(app).toLowerCase().includes("mediakeepa-video-enhancer"))
        })
        if (!cancelled) setComputeReady(ready)
      } catch {
        if (!cancelled) setComputeReady(false)
      }
    }
    void loadComputeReadiness()
    const timer = window.setInterval(() => void loadComputeReadiness(), 5000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
  }, [videoUrl])
  useEffect(() => () => {
    if (originalFrameUrl) URL.revokeObjectURL(originalFrameUrl)
  }, [originalFrameUrl])

  const dimensions = useMemo(
    () => targetDimensions(outputMode, metadata.width, metadata.height),
    [metadata.height, metadata.width, outputMode],
  )
  const isPreviewing = uploading === "preview" || ["queued", "processing"].includes(previewJob?.status || "")
  const isEnhancing = uploading === "full" || ["queued", "processing"].includes(fullJob?.status || "")
  const busy = isPreviewing || isEnhancing

  const chooseFile = (file: File) => {
    if (!isAcceptedVideo(file)) {
      toast.error("Use an MP4, MOV, M4V, MKV, or WebM video.")
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Videos must be 512 MB or smaller for this prototype.")
      return
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (originalFrameUrl) URL.revokeObjectURL(originalFrameUrl)
    setSelectedFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setOriginalFrameUrl(null)
    setMetadata({ duration: 0, width: 0, height: 0 })
    setCurrentTime(0)
    setOutputMode("original")
    setPreviewJobId(null)
    setPreviewJob(null)
    setFullJobId(null)
    setFullJob(null)
  }

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (originalFrameUrl) URL.revokeObjectURL(originalFrameUrl)
    setSelectedFile(null)
    setVideoUrl(null)
    setOriginalFrameUrl(null)
    setMetadata({ duration: 0, width: 0, height: 0 })
    setCurrentTime(0)
    setPlaying(false)
    setPreviewJobId(null)
    setPreviewJob(null)
    setFullJobId(null)
    setFullJob(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const seekTo = (time: number) => {
    const video = videoRef.current
    const next = Math.max(0, Math.min(metadata.duration || 0, time))
    if (video) {
      video.pause()
      video.currentTime = next
    }
    setPlaying(false)
    setCurrentTime(next)
    setPreviewJobId(null)
    setPreviewJob(null)
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) await video.play()
    else video.pause()
  }

  const captureFrame = async () => {
    const video = videoRef.current
    if (!video || !metadata.width || !metadata.height) throw new Error("The selected video frame is not ready yet.")
    video.pause()
    if (video.seeking) {
      await new Promise<void>((resolve) => video.addEventListener("seeked", () => resolve(), { once: true }))
    }
    if ("requestVideoFrameCallback" in video) {
      await new Promise<void>((resolve) => video.requestVideoFrameCallback(() => resolve()))
    }
    const canvas = document.createElement("canvas")
    canvas.width = metadata.width
    canvas.height = metadata.height
    const context = canvas.getContext("2d", { alpha: false })
    if (!context) throw new Error("MediaKeepa could not read the selected frame.")
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!blob) throw new Error("MediaKeepa could not prepare the selected frame.")
    if (originalFrameUrl) URL.revokeObjectURL(originalFrameUrl)
    setOriginalFrameUrl(URL.createObjectURL(blob))
    return blob
  }

  const startJob = async (kind: "preview" | "full") => {
    if (!selectedFile || busy || !computeReady || !dimensions.width || !dimensions.height) return
    setUploading(kind)
    const initial = { status: "queued", progress: 3, message: kind === "preview" ? "Preparing the selected frame..." : "Uploading your source video..." } as EnhancementJob
    if (kind === "preview") setPreviewJob(initial)
    else setFullJob(initial)
    try {
      const form = new FormData()
      if (kind === "preview") {
        const frame = await captureFrame()
        form.append("frame", frame, "selected-frame.png")
      } else {
        form.append("video", selectedFile)
      }
      form.append("output_width", String(dimensions.width))
      form.append("output_height", String(dimensions.height))
      form.append("duration", String(metadata.duration))
      const response = await fetch(kind === "preview" ? "/api/video-enhancer/preview" : "/api/video-enhancer", { method: "POST", body: form })
      const payload = await readApiResponse<{ job_id?: string; message?: string }>(response)
      if (!response.ok || !payload.job_id) throw new Error(payload.message || "Could not start Video Enhancer.")
      if (kind === "preview") {
        setPreviewJobId(payload.job_id)
        setPreviewJob({ status: "queued", progress: 5, message: "Maximum Quality preview queued." })
      } else {
        setFullJobId(payload.job_id)
        setFullJob({ status: "queued", progress: 5, message: "Full video enhancement queued." })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start Video Enhancer."
      if (kind === "preview") setPreviewJob({ status: "error", progress: 0, message })
      else setFullJob({ status: "error", progress: 0, message })
      toast.error(message)
    } finally {
      setUploading(null)
    }
  }

  const activeJob = isEnhancing || fullJob?.status === "error" ? fullJob : previewJob

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <AppHeader />

      <main className="space-y-5 pb-8">
        {!selectedFile ? (
          <Card
            className={cn("cursor-pointer gap-5 border-2 border-dashed px-6 py-16 text-center transition-colors sm:py-24", dragging ? "border-foreground bg-muted/50" : "hover:border-muted-foreground")}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files[0]
              if (file) chooseFile(file)
            }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background">
              <FilmSlate size={31} weight="fill" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Video Enhancer</h1>
              <p className="font-medium">Drop a video here or click to browse</p>
              <p className="text-sm text-muted-foreground">Maximum Quality restoration · MP4, MOV, M4V, MKV, or WebM · up to 512 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.mkv,.webm"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) chooseFile(file)
              }}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Video Enhancer</h1>
                  <Badge variant="outline" className="gap-1.5"><Sparkle size={13} weight="fill" /> Maximum Quality</Badge>
                </div>
                <p className="mt-1 max-w-2xl truncate text-sm text-muted-foreground">{selectedFile.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy} className="gap-2"><X size={17} /> Clear</Button>
            </div>

            <Card className="overflow-hidden border-2 bg-black p-0">
              <div className="relative flex aspect-video max-h-[68vh] min-h-72 items-center justify-center">
                {fullJob?.status === "completed" && fullJob.preview_url ? (
                  <video src={fullJob.preview_url} controls className="h-full w-full object-contain" />
                ) : previewJob?.status === "completed" && previewJob.preview_url && originalFrameUrl ? (
                  <div className="grid h-full w-full grid-cols-2">
                    <div className="relative flex min-w-0 items-center justify-center border-r border-white/15 bg-black">
                      <img src={originalFrameUrl} alt="Original selected frame" className="h-full w-full object-contain" />
                      <span className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-xs font-medium text-white">Original</span>
                    </div>
                    <div className="relative flex min-w-0 items-center justify-center bg-black">
                      <img src={previewJob.preview_url} alt="Enhanced selected frame" className="h-full w-full object-contain" />
                      <span className="absolute right-3 top-3 rounded-md bg-white px-2 py-1 text-xs font-semibold text-black">Enhanced</span>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={videoUrl || undefined}
                    className="h-full w-full object-contain"
                    playsInline
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget
                      setMetadata({ duration: video.duration || 0, width: video.videoWidth, height: video.videoHeight })
                    }}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />
                )}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
                    <div className="space-y-3 text-center text-white">
                      <ArrowClockwise size={30} className="mx-auto animate-spin" />
                      <p className="font-medium">{activeJob?.message || "Preparing enhancement..."}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="gap-3 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => void togglePlayback()} disabled={busy || previewJob?.status === "completed" || fullJob?.status === "completed"} aria-label={playing ? "Pause video" : "Play video"}>
                  {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
                </Button>
                <span className="w-12 text-right text-xs font-medium tabular-nums">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={metadata.duration || 0}
                  step="0.001"
                  value={Math.min(currentTime, metadata.duration || 0)}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  disabled={busy}
                  className="h-2 min-w-0 flex-1 cursor-pointer accent-foreground disabled:cursor-not-allowed"
                  aria-label="Video timeline"
                />
                <span className="w-12 text-xs font-medium tabular-nums">{formatTime(metadata.duration)}</span>
              </div>
              <p className="text-center text-xs text-muted-foreground">Preview point · {formatTime(currentTime)} · drag the timeline to select an exact frame</p>
            </Card>

            <Card className="gap-5 p-5 sm:p-6">
              {computeReady === false && (
                <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Video Enhancer needs one-time Compute setup</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Set it up on at least one connected Modal account before starting an enhancement.</p>
                  </div>
                  <Button asChild variant="outline" className="shrink-0"><Link to="/compute">Open Compute</Link></Button>
                </div>
              )}
              <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Enhancement</p>
                  <div className="flex h-12 items-center gap-3 rounded-xl border bg-muted/30 px-4">
                    <Sparkle size={19} weight="fill" />
                    <span className="font-semibold">Maximum Quality</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Output</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      ["original", "Original", "Restore only"],
                      ["1080p", "1080p", "Full HD"],
                      ["1440p", "1440p", "2K"],
                      ["4k", "4K", "Ultra HD"],
                    ] as Array<[OutputMode, string, string]>).map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setOutputMode(value); setPreviewJobId(null); setPreviewJob(null) }}
                        disabled={busy}
                        className={cn("rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50", outputMode === value ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
                      >
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className={cn("block text-xs", outputMode === value ? "text-background/70" : "text-muted-foreground")}>{description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeJob && (busy || activeJob.status === "error") && (
                <div className={cn("rounded-xl border p-4", activeJob.status === "error" && "border-destructive/30 bg-destructive/10 text-destructive") }>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{activeJob.message}</span>
                    {activeJob.status !== "error" && <span className="font-semibold tabular-nums">{Math.round(activeJob.progress)}%</span>}
                  </div>
                  {activeJob.status !== "error" && <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${Math.max(4, activeJob.progress)}%` }} /></div>}
                </div>
              )}

              {fullJob?.status === "completed" && fullJob.download_url ? (
                <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle size={20} weight="fill" /> Maximum Quality video ready · {fullJob.width} × {fullJob.height}</div>
                  <Button asChild className="gap-2"><a href={fullJob.download_url} download><DownloadSimple size={18} weight="bold" /> Download video</a></Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" size="lg" className="h-12 gap-2" onClick={() => void startJob("preview")} disabled={busy || !metadata.duration || !computeReady}>
                    {isPreviewing ? <ArrowClockwise size={18} className="animate-spin" /> : <Sparkle size={18} weight="fill" />}
                    {isPreviewing ? "Enhancing Preview..." : "Preview Enhancement"}
                  </Button>
                  <Button size="lg" className="h-12 gap-2" onClick={() => void startJob("full")} disabled={busy || !metadata.duration || !computeReady}>
                    {isEnhancing ? <ArrowClockwise size={18} className="animate-spin" /> : <FilmSlate size={18} weight="fill" />}
                    {isEnhancing ? "Enhancing Full Video..." : "Enhance Full Video"}
                  </Button>
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">{dimensions.width && dimensions.height ? `${dimensions.width} × ${dimensions.height} output` : "Reading video dimensions"} · routed through MediaKeepa Compute</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
