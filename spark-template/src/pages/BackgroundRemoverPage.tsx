import { useEffect, useRef, useState } from "react"
import { CheckCircle, DownloadSimple, Image as ImageIcon, Upload, X } from "@phosphor-icons/react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]

type BackgroundJob = {
  status: "queued" | "processing" | "completed" | "error"
  progress: number
  message: string
  preview_url?: string
  download_url?: string
  width?: number
  height?: number
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text()
  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(`The server returned an unexpected response (${response.status}).`)
  }
}

function isAcceptedImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || ""
  return file.type.startsWith("image/") && ACCEPTED_EXTENSIONS.includes(extension)
}

export function BackgroundRemoverPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<BackgroundJob | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => () => {
    if (originalPreview) URL.revokeObjectURL(originalPreview)
  }, [originalPreview])

  useEffect(() => {
    if (!jobId || job?.status === "completed" || job?.status === "error") return

    let cancelled = false
    const poll = async () => {
      try {
        const response = await fetch(`/api/background-remover/status/${jobId}`)
        const nextJob = await readApiResponse<BackgroundJob>(response)
        if (!response.ok) throw new Error(nextJob.message || "Could not check background removal progress.")
        if (cancelled) return
        setJob(nextJob)
        if (nextJob.status === "completed") {
          toast.success("Background removed")
          return
        }
        if (nextJob.status === "error") {
          toast.error(nextJob.message)
          return
        }
        window.setTimeout(poll, 900)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : "Could not check background removal progress."
        setJob({ status: "error", progress: 0, message })
        toast.error(message)
      }
    }

    const timeout = window.setTimeout(poll, 500)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [jobId, job?.status])

  const chooseFile = (file: File) => {
    if (!isAcceptedImage(file)) {
      toast.error("Use a JPG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Images must be 20 MB or smaller.")
      return
    }
    if (originalPreview) URL.revokeObjectURL(originalPreview)
    setSelectedFile(file)
    setOriginalPreview(URL.createObjectURL(file))
    setJobId(null)
    setJob(null)
  }

  const reset = () => {
    if (originalPreview) URL.revokeObjectURL(originalPreview)
    setSelectedFile(null)
    setOriginalPreview(null)
    setJobId(null)
    setJob(null)
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeBackground = async () => {
    if (!selectedFile || isUploading) return
    setIsUploading(true)
    setJob({ status: "queued", progress: 3, message: "Uploading your image..." })
    try {
      const form = new FormData()
      form.append("image", selectedFile)
      const response = await fetch("/api/background-remover", { method: "POST", body: form })
      const payload = await readApiResponse<{ status: string; job_id?: string; message?: string }>(response)
      if (!response.ok || !payload.job_id) {
        throw new Error(payload.message || "Could not start background removal.")
      }
      setJobId(payload.job_id)
      setJob({ status: "queued", progress: 5, message: "Your image is queued." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start background removal."
      setJob({ status: "error", progress: 0, message })
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const isProcessing = isUploading || job?.status === "queued" || job?.status === "processing"
  const checkerboard = {
    backgroundColor: "#f5f5f5",
    backgroundImage: "linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%)",
    backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
    backgroundSize: "16px 16px",
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <AppHeader />

      <main className="space-y-5 pb-8">
        {!selectedFile ? (
          <Card
            className={`cursor-pointer gap-4 border-2 border-dashed p-8 text-center transition-colors sm:p-10 ${isDragging ? "border-foreground bg-muted/60" : "hover:border-muted-foreground"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { event.preventDefault(); setIsDragging(false) }}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              const file = event.dataTransfer.files[0]
              if (file) chooseFile(file)
            }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background">
              <Upload size={30} weight="bold" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Background Remover</h1>
              <p className="font-medium">Drop an image here or click to browse</p>
              <p className="text-sm text-muted-foreground">JPG, PNG, or WebP up to 20 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) chooseFile(file)
              }}
            />
          </Card>
        ) : (
          <div className="space-y-5">
            <Card className="gap-5 border-2 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <ImageIcon size={22} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate font-semibold">Background Remover</h1>
                    <p className="truncate text-sm text-muted-foreground">{selectedFile.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} disabled={isProcessing} className="shrink-0 gap-2">
                  <X size={17} />
                  Clear
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Original</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                    {originalPreview && <img src={originalPreview} alt="Original upload" className="h-full w-full object-contain" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Transparent</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border" style={checkerboard}>
                    {job?.status === "completed" && job.preview_url ? (
                      <img src={job.preview_url} alt="Background removed" className="h-full w-full object-contain" />
                    ) : (
                      <div className="max-w-xs px-6 text-center text-sm text-muted-foreground">
                        {job?.message || "Your result will appear here."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isProcessing && job && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{job.message}</span>
                    <span className="font-semibold tabular-nums">{Math.round(job.progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${job.progress}%` }} />
                  </div>
                </div>
              )}

              {job?.status === "error" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {job.message}
                </div>
              )}

              {job?.status === "completed" && job.download_url ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle size={20} weight="fill" />
                    Transparent PNG ready{job.width && job.height ? ` · ${job.width} × ${job.height}` : ""}
                  </div>
                  <Button asChild className="gap-2">
                    <a href={job.download_url} download>
                      <DownloadSimple size={18} weight="bold" />
                      Download PNG
                    </a>
                  </Button>
                </div>
              ) : (
                <Button onClick={removeBackground} disabled={isProcessing} size="lg" className="h-12 w-full">
                  {isProcessing ? "Removing Background..." : "Remove Background"}
                </Button>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
