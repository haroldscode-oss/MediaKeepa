import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowClockwise,
  ArrowsLeftRight,
  CheckCircle,
  DownloadSimple,
  Eye,
  FilmSlate,
  Gauge,
  Info,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkle,
  X,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const MAX_VIDEO_BYTES = 512 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ["mp4", "mov", "m4v", "mkv", "webm"]

type OutputMode = "original" | "1080p" | "1440p" | "4k"
type ComparisonMode = "original" | "split" | "enhanced"
type ModelMode = "sharp" | "natural"
type OutputQuality = "maximum" | "high" | "balanced" | "compact"
type PresetId = "automatic" | "natural" | "detail" | "compression" | "portrait" | "custom"

type EnhancementSettings = {
  model: ModelMode
  preserveSourceColor: boolean
  detail: number
  denoise: number
  compressionRepair: number
  sharpen: number
  grain: number
  outputQuality: OutputQuality
  outputFps: "source" | "24" | "30" | "60"
  seed: number
  cfgScale: number
  cfgRescale: number
}

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

const DEFAULT_SETTINGS: EnhancementSettings = {
  model: "sharp",
  preserveSourceColor: true,
  detail: 0,
  denoise: 0,
  compressionRepair: 0,
  sharpen: 0,
  grain: 0,
  outputQuality: "maximum",
  outputFps: "source",
  seed: 666,
  cfgScale: 1,
  cfgRescale: 0,
}

const PRESETS: Array<{ id: Exclude<PresetId, "custom">; label: string; description: string; settings: Partial<EnhancementSettings> }> = [
  {
    id: "automatic",
    label: "Automatic",
    description: "The immaculate Sharp restoration you already tested.",
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    id: "natural",
    label: "Clean & Natural",
    description: "Gentler texture with light cleanup for already-good footage.",
    settings: { model: "natural", compressionRepair: 12, denoise: 10, detail: 0, sharpen: 0, grain: 0 },
  },
  {
    id: "detail",
    label: "Maximum Detail",
    description: "Sharp 7B plus a restrained contrast-adaptive detail finish.",
    settings: { model: "sharp", compressionRepair: 0, denoise: 0, detail: 16, sharpen: 4, grain: 0 },
  },
  {
    id: "compression",
    label: "Heavy Compression Repair",
    description: "Deblock and denoise before SeedVR rebuilds the frame.",
    settings: { model: "natural", compressionRepair: 58, denoise: 34, detail: 12, sharpen: 4, grain: 0 },
  },
  {
    id: "portrait",
    label: "Face / Portrait",
    description: "Natural reconstruction with soft cleanup and minimal edge finishing.",
    settings: { model: "natural", compressionRepair: 15, denoise: 16, detail: 4, sharpen: 0, grain: 2 },
  },
]

const OUTPUT_MODES: Array<{ value: OutputMode; label: string; description: string }> = [
  { value: "original", label: "Original", description: "Restore only" },
  { value: "1080p", label: "1080p", description: "Full HD" },
  { value: "1440p", label: "1440p", description: "2K" },
  { value: "4k", label: "4K", description: "Ultra HD" },
]

const QUALITY_LABELS: Record<OutputQuality, string> = {
  maximum: "Maximum / Master",
  high: "High quality",
  balanced: "Balanced",
  compact: "Compact",
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

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "Waiting for video"
  if (minutes < 1) return "Under 1 minute"
  if (minutes < 60) return `About ${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainder = Math.round(minutes % 60)
  return `About ${hours}h ${remainder}m`
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—"
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
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
  return width >= height ? { width: longEdge, height: shortEdge } : { width: shortEdge, height: longEdge }
}

function ControlSlider({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string
  description: string
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{label}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{description}</p>
        </div>
        <span className="min-w-8 rounded-md bg-zinc-800 px-1.5 py-1 text-center text-[11px] font-semibold tabular-nums text-zinc-300">
          {value || "Off"}
        </span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        onValueChange={(values) => onChange(values[0] || 0)}
        className="[&_[data-slot=slider-range]]:bg-violet-400 [&_[data-slot=slider-thumb]]:border-violet-300 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:bg-zinc-800"
      />
    </div>
  )
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
  const previewStageRef = useRef<HTMLDivElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [originalFrameUrl, setOriginalFrameUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState({ duration: 0, width: 0, height: 0 })
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [outputMode, setOutputMode] = useState<OutputMode>("original")
  const [presetId, setPresetId] = useState<PresetId>("automatic")
  const [settings, setSettings] = useState<EnhancementSettings>(DEFAULT_SETTINGS)
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("split")
  const [splitPosition, setSplitPosition] = useState(50)
  const [draggingSplit, setDraggingSplit] = useState(false)
  const [previewJobId, setPreviewJobId] = useState<string | null>(null)
  const [previewJob, setPreviewJob] = useState<EnhancementJob | null>(null)
  const [fullJobId, setFullJobId] = useState<string | null>(null)
  const [fullJob, setFullJob] = useState<EnhancementJob | null>(null)
  const [uploading, setUploading] = useState<"preview" | "full" | null>(null)
  const [computeReady, setComputeReady] = useState<boolean | null>(null)

  const setPreview = useCallback((job: EnhancementJob) => setPreviewJob(job), [])
  const setFull = useCallback((job: EnhancementJob) => setFullJob(job), [])
  useEnhancementPoll(previewJobId, previewJob, setPreview, "Enhanced frame preview ready")
  useEnhancementPoll(fullJobId, fullJob, setFull, "Enhanced video ready")

  useEffect(() => {
    if (previewJob?.status === "completed") setComparisonMode("split")
  }, [previewJob?.status])

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
  const hasFrameComparison = previewJob?.status === "completed" && !!previewJob.preview_url && !!originalFrameUrl
  const activePreset = PRESETS.find((preset) => preset.id === presetId)
  const modelLabel = settings.model === "sharp" ? "SeedVR2 7B Sharp" : "SeedVR2 7B Natural"

  const estimate = useMemo(() => {
    if (!metadata.duration || !dimensions.width || !dimensions.height) {
      return { cost: 0, runtimeMinutes: 0, size: 0 }
    }
    const pixelRatio = Math.max(0.25, (dimensions.width * dimensions.height) / (1920 * 1080))
    const cost = Math.max(2, metadata.duration * 0.286 * pixelRatio)
    const runtimeMinutes = metadata.duration * 0.94 * pixelRatio * (settings.model === "natural" ? 0.98 : 1)
    const bitsPerPixel = { maximum: 0.55, high: 0.32, balanced: 0.19, compact: 0.11 }[settings.outputQuality]
    const fps = settings.outputFps === "source" ? 30 : Number(settings.outputFps)
    const size = dimensions.width * dimensions.height * fps * metadata.duration * bitsPerPixel / 8
    return { cost, runtimeMinutes, size }
  }, [dimensions.height, dimensions.width, metadata.duration, settings.model, settings.outputFps, settings.outputQuality])

  const invalidateOutputs = () => {
    setPreviewJobId(null)
    setPreviewJob(null)
    setFullJobId(null)
    setFullJob(null)
    if (originalFrameUrl) URL.revokeObjectURL(originalFrameUrl)
    setOriginalFrameUrl(null)
  }

  const updateSettings = (changes: Partial<EnhancementSettings>) => {
    invalidateOutputs()
    setPresetId("custom")
    setSettings((current) => ({ ...current, ...changes }))
  }

  const applyPreset = (id: PresetId) => {
    if (id === "custom") return
    const preset = PRESETS.find((candidate) => candidate.id === id)
    if (!preset) return
    invalidateOutputs()
    setPresetId(id)
    setSettings((current) => ({ ...current, ...preset.settings }))
  }

  const chooseFile = (file: File) => {
    if (!isAcceptedVideo(file)) {
      toast.error("Use an MP4, MOV, M4V, MKV, or WebM video.")
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Videos must be 512 MB or smaller.")
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
    setPresetId("automatic")
    setSettings(DEFAULT_SETTINGS)
    setComparisonMode("split")
    setSplitPosition(50)
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
    if (originalFrameUrl) URL.revokeObjectURL(originalFrameUrl)
    setOriginalFrameUrl(null)
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

  const appendSettings = (form: FormData) => {
    form.append("model", settings.model)
    form.append("preserve_source_color", String(settings.preserveSourceColor))
    form.append("detail", String(settings.detail))
    form.append("denoise", String(settings.denoise))
    form.append("compression_repair", String(settings.compressionRepair))
    form.append("sharpen", String(settings.sharpen))
    form.append("grain", String(settings.grain))
    form.append("output_quality", settings.outputQuality)
    form.append("output_fps", settings.outputFps === "source" ? "" : settings.outputFps)
    form.append("seed", String(settings.seed))
    form.append("cfg_scale", String(settings.cfgScale))
    form.append("cfg_rescale", String(settings.cfgRescale))
  }

  const startJob = async (kind: "preview" | "full") => {
    if (!selectedFile || busy || !computeReady || !dimensions.width || !dimensions.height) return
    setUploading(kind)
    const initial = {
      status: "queued",
      progress: 3,
      message: kind === "preview" ? "Preparing the selected frame..." : "Uploading your source video...",
    } as EnhancementJob
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
      appendSettings(form)
      const response = await fetch(kind === "preview" ? "/api/video-enhancer/preview" : "/api/video-enhancer", { method: "POST", body: form })
      const payload = await readApiResponse<{ job_id?: string; message?: string }>(response)
      if (!response.ok || !payload.job_id) throw new Error(payload.message || "Could not start Video Enhancer.")
      if (kind === "preview") {
        setPreviewJobId(payload.job_id)
        setPreviewJob({ status: "queued", progress: 5, message: `${modelLabel} frame preview queued.` })
      } else {
        setFullJobId(payload.job_id)
        setFullJob({ status: "queued", progress: 5, message: "Full restoration queued." })
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

  const updateSplitFromPointer = (clientX: number) => {
    const stage = previewStageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    setSplitPosition(Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)))
  }

  const activeJob = isEnhancing || fullJob?.status === "error" ? fullJob : previewJob

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <AppHeader />

      <main className="space-y-4 pb-8">
        {!selectedFile ? (
          <Card
            className={cn(
              "cursor-pointer overflow-hidden border-2 border-dashed bg-zinc-950 px-6 py-20 text-center text-white transition-colors sm:py-28",
              dragging ? "border-violet-400 bg-violet-950/30" : "border-zinc-700 hover:border-zinc-500",
            )}
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
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-[0_0_45px_rgba(139,92,246,.35)]">
              <FilmSlate size={31} weight="fill" />
            </div>
            <div className="mx-auto mt-6 max-w-xl space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Video Enhancer</h1>
                <Badge className="border-violet-400/30 bg-violet-400/15 text-violet-200">SeedVR2</Badge>
              </div>
              <p className="font-medium text-zinc-200">Drop a video to open the restoration workspace</p>
              <p className="text-sm leading-6 text-zinc-500">Before / after previews, restoration presets, real processing controls, output sizing, and cost estimates.</p>
              <p className="pt-2 text-xs text-zinc-600">MP4, MOV, M4V, MKV, or WebM · up to 512 MB</p>
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
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 px-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Video Enhancer</h1>
                  <Badge variant="outline" className="gap-1.5"><Sparkle size={13} weight="fill" /> SeedVR2 Workspace</Badge>
                </div>
                <p className="mt-1 max-w-3xl truncate text-sm text-muted-foreground">{selectedFile.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy} className="gap-2"><X size={17} /> Clear</Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#101113] shadow-2xl shadow-black/10 xl:grid xl:grid-cols-[minmax(0,1fr)_370px]">
              <section className="min-w-0 bg-[#0b0c0e] text-white">
                <div className="flex min-h-12 items-center justify-between border-b border-white/10 px-3 py-2 sm:px-4">
                  <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                    {(["original", "split", "enhanced"] as ComparisonMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={!hasFrameComparison || !!fullJob?.preview_url}
                        onClick={() => setComparisonMode(mode)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                          comparisonMode === mode && hasFrameComparison ? "bg-white text-black" : "text-zinc-400 hover:text-white",
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <Eye size={14} />
                    {hasFrameComparison ? "Drag the split to inspect" : "Generate a frame preview to compare"}
                  </div>
                </div>

                <div
                  ref={previewStageRef}
                  className={cn(
                    "relative flex aspect-video min-h-[320px] max-h-[calc(100vh-18rem)] items-center justify-center overflow-hidden bg-black",
                    hasFrameComparison && comparisonMode === "split" && "cursor-col-resize",
                  )}
                  onPointerDown={(event) => {
                    if (!hasFrameComparison || comparisonMode !== "split") return
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDraggingSplit(true)
                    updateSplitFromPointer(event.clientX)
                  }}
                  onPointerMove={(event) => {
                    if (draggingSplit) updateSplitFromPointer(event.clientX)
                  }}
                  onPointerUp={(event) => {
                    if (draggingSplit) event.currentTarget.releasePointerCapture(event.pointerId)
                    setDraggingSplit(false)
                  }}
                  onPointerCancel={() => setDraggingSplit(false)}
                >
                  <video
                    ref={videoRef}
                    src={videoUrl || undefined}
                    className={cn("h-full w-full object-contain", (hasFrameComparison || fullJob?.status === "completed") && "hidden")}
                    playsInline
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget
                      setMetadata({ duration: video.duration || 0, width: video.videoWidth, height: video.videoHeight })
                      if (currentTime > 0) video.currentTime = currentTime
                    }}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />

                  {fullJob?.status === "completed" && fullJob.preview_url && (
                    <video src={fullJob.preview_url} controls autoPlay className="h-full w-full object-contain" />
                  )}

                  {hasFrameComparison && previewJob?.preview_url && originalFrameUrl && !fullJob?.preview_url && (
                    <>
                      {comparisonMode === "original" && <img src={originalFrameUrl} alt="Original selected frame" className="h-full w-full object-contain" />}
                      {comparisonMode === "enhanced" && <img src={previewJob.preview_url} alt="Enhanced selected frame" className="h-full w-full object-contain" />}
                      {comparisonMode === "split" && (
                        <>
                          <img src={originalFrameUrl} alt="Original selected frame" className="absolute inset-0 h-full w-full object-contain" />
                          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}>
                            <img src={previewJob.preview_url} alt="Enhanced selected frame" className="absolute inset-0 h-full w-full object-contain" />
                          </div>
                          <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white shadow-[0_0_10px_rgba(0,0,0,.9)]" style={{ left: `${splitPosition}%` }}>
                            <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/75 text-white shadow-lg">
                              <ArrowsLeftRight size={17} weight="bold" />
                            </div>
                          </div>
                        </>
                      )}
                      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[11px] font-medium text-white">Original</span>
                      <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-violet-500 px-2 py-1 text-[11px] font-semibold text-white">Enhanced</span>
                    </>
                  )}

                  {busy && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
                      <div className="max-w-lg space-y-3 px-6 text-center text-white">
                        <ArrowClockwise size={30} className="mx-auto animate-spin" />
                        <p className="font-medium">{activeJob?.message || "Preparing enhancement..."}</p>
                        <p className="text-xs text-zinc-400">{isEnhancing ? "Full SeedVR restoration runs in temporal windows on four Hopper GPUs." : "This preview uses the same 7B restoration model as export."}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 bg-[#111214] px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void togglePlayback()}
                      disabled={busy || hasFrameComparison || fullJob?.status === "completed"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                      aria-label={playing ? "Pause video" : "Play video"}
                    >
                      {playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}
                    </button>
                    <span className="w-11 text-right text-[11px] font-medium tabular-nums text-zinc-400">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={metadata.duration || 0}
                      step="0.001"
                      value={Math.min(currentTime, metadata.duration || 0)}
                      onChange={(event) => seekTo(Number(event.target.value))}
                      disabled={busy || fullJob?.status === "completed"}
                      className="h-1.5 min-w-0 flex-1 cursor-pointer accent-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Video preview timeline"
                    />
                    <span className="w-11 text-[11px] font-medium tabular-nums text-zinc-400">{formatTime(metadata.duration)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>Preview selector · exact frame at {formatTime(currentTime)}</span>
                    <span>{metadata.width && metadata.height ? `${metadata.width} × ${metadata.height} source` : "Reading source"}</span>
                  </div>
                </div>
              </section>

              <aside className="flex max-h-none min-h-0 flex-col border-t border-zinc-800 bg-[#151619] text-white xl:max-h-[calc(100vh-8rem)] xl:border-l xl:border-t-0">
                <div className="flex min-h-12 items-center justify-between border-b border-white/10 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={17} weight="bold" />
                    <h2 className="text-sm font-semibold">Enhancement controls</h2>
                  </div>
                  <Badge className="border-white/10 bg-white/5 text-[10px] text-zinc-400" variant="outline">1-step AI</Badge>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5">
                  <Accordion type="multiple" defaultValue={["preset", "resolution", "model", "processing", "output"]}>
                    <AccordionItem value="preset" className="border-white/10">
                      <AccordionTrigger className="py-4 text-zinc-100 hover:no-underline">Preset</AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-5">
                        <Select value={presetId} onValueChange={(value) => applyPreset(value as PresetId)} disabled={busy}>
                          <SelectTrigger className="h-11 w-full border-zinc-700 bg-zinc-900 text-zinc-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESETS.map((preset) => <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>)}
                            {presetId === "custom" && <SelectItem value="custom">Custom</SelectItem>}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] leading-5 text-zinc-500">
                          {presetId === "custom" ? "Custom settings. Choose a preset anytime to reset the processing stack." : activePreset?.description}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="resolution" className="border-white/10">
                      <AccordionTrigger className="py-4 text-zinc-100 hover:no-underline">Output Resolution</AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <div className="grid grid-cols-2 gap-2">
                          {OUTPUT_MODES.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => { invalidateOutputs(); setOutputMode(option.value) }}
                              disabled={busy}
                              className={cn(
                                "rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                                outputMode === option.value
                                  ? "border-violet-400 bg-violet-400/15 text-white"
                                  : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600",
                              )}
                            >
                              <span className="block text-xs font-semibold">{option.label}</span>
                              <span className="mt-0.5 block text-[10px] text-zinc-500">{option.description}</span>
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] text-zinc-500">{dimensions.width && dimensions.height ? `${dimensions.width} × ${dimensions.height} exact output` : "Reading source dimensions"}</p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="model" className="border-white/10">
                      <AccordionTrigger className="py-4 text-zinc-100 hover:no-underline">Enhancement Model</AccordionTrigger>
                      <AccordionContent className="space-y-2 pb-5">
                        {([
                          { id: "sharp" as ModelMode, title: "7B Sharp", copy: "Maximum perceived detail · best for soft or degraded footage" },
                          { id: "natural" as ModelMode, title: "7B Natural", copy: "Standard official 7B · gentler on already-clean footage" },
                        ]).map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            disabled={busy}
                            onClick={() => updateSettings({ model: model.id })}
                            className={cn(
                              "w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                              settings.model === model.id ? "border-violet-400 bg-violet-400/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600",
                            )}
                          >
                            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-100">
                              {model.title}
                              <span className="text-[10px] font-medium text-amber-300">4× H200</span>
                            </span>
                            <span className="mt-1 block text-[10px] leading-4 text-zinc-500">{model.copy}</span>
                          </button>
                        ))}
                        <div className="flex gap-2 rounded-lg border border-sky-400/15 bg-sky-400/5 p-3 text-[10px] leading-4 text-sky-200/70">
                          <Info size={14} className="mt-0.5 shrink-0" />
                          These are the two real official 7B checkpoints—not cosmetic model names.
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="processing" className="border-white/10">
                      <AccordionTrigger className="py-4 text-zinc-100 hover:no-underline">Processing</AccordionTrigger>
                      <AccordionContent className="space-y-5 pb-5">
                        <ControlSlider label="Detail" description="Contrast-adaptive detail finish after restoration" value={settings.detail} disabled={busy} onChange={(detail) => updateSettings({ detail })} />
                        <ControlSlider label="Denoise" description="Temporal and spatial cleanup before SeedVR" value={settings.denoise} disabled={busy} onChange={(denoise) => updateSettings({ denoise })} />
                        <ControlSlider label="Compression Repair" description="Deblock ringing and low-bitrate macroblocks first" value={settings.compressionRepair} disabled={busy} onChange={(compressionRepair) => updateSettings({ compressionRepair })} />
                        <ControlSlider label="Sharpen" description="Edge sharpening after the AI reconstruction" value={settings.sharpen} disabled={busy} onChange={(sharpen) => updateSettings({ sharpen })} />
                        <ControlSlider label="Grain" description="Reintroduce fine temporal texture at the end" value={settings.grain} disabled={busy} onChange={(grain) => updateSettings({ grain })} />
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                          <div>
                            <p className="text-xs font-medium text-zinc-100">Source color match</p>
                            <p className="mt-1 text-[10px] leading-4 text-zinc-500">Official wavelet color preservation</p>
                          </div>
                          <Switch checked={settings.preserveSourceColor} disabled={busy} onCheckedChange={(preserveSourceColor) => updateSettings({ preserveSourceColor })} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="output" className="border-white/10">
                      <AccordionTrigger className="py-4 text-zinc-100 hover:no-underline">Output</AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-5">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-zinc-300">Encoding quality</label>
                          <Select value={settings.outputQuality} onValueChange={(value) => updateSettings({ outputQuality: value as OutputQuality })} disabled={busy}>
                            <SelectTrigger className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(QUALITY_LABELS) as OutputQuality[]).map((quality) => <SelectItem key={quality} value={quality}>{QUALITY_LABELS[quality]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] leading-4 text-zinc-500">MP4 · H.264 · original audio preserved</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-zinc-300">Frame rate</label>
                          <Select value={settings.outputFps} onValueChange={(value) => updateSettings({ outputFps: value as EnhancementSettings["outputFps"] })} disabled={busy}>
                            <SelectTrigger className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="source">Source FPS</SelectItem>
                              <SelectItem value="24">24 FPS</SelectItem>
                              <SelectItem value="30">30 FPS</SelectItem>
                              <SelectItem value="60">60 FPS</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] leading-4 text-zinc-500">Frame-rate conversion duplicates or drops frames; it is not AI interpolation.</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="advanced" className="border-white/10">
                      <AccordionTrigger className="py-4 text-zinc-100 hover:no-underline">Advanced SeedVR2</AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-5">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Seed", value: settings.seed, step: 1, key: "seed" },
                            { label: "CFG", value: settings.cfgScale, step: 0.05, key: "cfgScale" },
                            { label: "Rescale", value: settings.cfgRescale, step: 0.05, key: "cfgRescale" },
                          ].map((field) => (
                            <label key={field.key} className="space-y-1.5 text-[10px] text-zinc-500">
                              {field.label}
                              <input
                                type="number"
                                value={field.value}
                                step={field.step}
                                disabled={busy}
                                onChange={(event) => updateSettings({ [field.key]: Number(event.target.value) } as Partial<EnhancementSettings>)}
                                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none focus:border-violet-400"
                              />
                            </label>
                          ))}
                        </div>
                        <p className="text-[10px] leading-4 text-zinc-500">SeedVR2 is a one-step model. Sampling steps stay locked to the official value.</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="border-t border-white/10 bg-[#121316] p-4">
                  {computeReady === false && (
                    <div className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3">
                      <p className="text-xs font-semibold text-amber-200">Compute setup required</p>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-500">Prepare Video Enhancer on at least one Modal account.</p>
                      <Button asChild variant="outline" size="sm" className="mt-2 h-8 border-zinc-700 bg-transparent text-zinc-200"><Link to="/compute">Open Compute</Link></Button>
                    </div>
                  )}

                  <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <div>
                      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-600"><Gauge size={11} /> Estimate</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">${estimate.cost ? estimate.cost.toFixed(2) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-600">Runtime</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">{formatDuration(estimate.runtimeMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-600">File</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">~{formatBytes(estimate.size)}</p>
                    </div>
                  </div>

                  {activeJob && (busy || activeJob.status === "error") && (
                    <div className={cn("mb-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3", activeJob.status === "error" && "border-red-400/20 bg-red-400/5") }>
                      <div className="flex items-start justify-between gap-3 text-[11px]">
                        <span className={cn("leading-4 text-zinc-300", activeJob.status === "error" && "text-red-300")}>{activeJob.message}</span>
                        {activeJob.status !== "error" && <span className="font-semibold tabular-nums text-zinc-400">{Math.round(activeJob.progress)}%</span>}
                      </div>
                      {activeJob.status !== "error" && <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-violet-400 transition-[width] duration-500" style={{ width: `${Math.max(4, activeJob.progress)}%` }} /></div>}
                    </div>
                  )}

                  {fullJob?.status === "completed" && fullJob.download_url ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><CheckCircle size={17} weight="fill" /> Export ready · {fullJob.width} × {fullJob.height}</div>
                      <Button asChild className="h-11 w-full gap-2 bg-white text-black hover:bg-zinc-200"><a href={fullJob.download_url} download><DownloadSimple size={18} weight="bold" /> Download enhanced video</a></Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-11 gap-2 border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-white"
                        onClick={() => void startJob("preview")}
                        disabled={busy || !metadata.duration || !computeReady}
                      >
                        {isPreviewing ? <ArrowClockwise size={16} className="animate-spin" /> : <Eye size={16} />}
                        {isPreviewing ? "Previewing" : "Preview"}
                      </Button>
                      <Button
                        className="h-11 gap-2 bg-violet-500 text-white hover:bg-violet-400"
                        onClick={() => void startJob("full")}
                        disabled={busy || !metadata.duration || !computeReady}
                      >
                        {isEnhancing ? <ArrowClockwise size={16} className="animate-spin" /> : <FilmSlate size={16} weight="fill" />}
                        {isEnhancing ? "Exporting" : "Export"}
                      </Button>
                    </div>
                  )}
                  <p className="mt-2 text-center text-[9px] leading-4 text-zinc-600">Preview restores one exact frame · export uses four Hopper GPUs</p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
