import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle,
  DownloadSimple,
  FileAudio,
  Guitar,
  Metronome,
  MusicNote,
  Pause,
  Play,
  SpeakerHigh,
  Upload,
  X,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import { StemFader } from "@/components/StemFader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ["mp3", "wav", "flac", "m4a", "aac", "ogg"]

type SeparatorStem = {
  name: string
  label: string
  url: string
  download_url: string
}

type SeparatorStatus = {
  status: "queued" | "loading_model" | "processing" | "completed" | "error"
  progress: number
  message: string
  stems?: SeparatorStem[]
  archive_url?: string
}

function isAcceptedAudio(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || ""
  return file.type.startsWith("audio/") || ACCEPTED_EXTENSIONS.includes(extension)
}

function waveformFor(name: string) {
  const seed = [...name].reduce((total, character) => total + character.charCodeAt(0), 0)
  return Array.from({ length: 72 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.63) * 0.25
    const pulse = Math.sin((index + seed) * 0.19) * 0.18
    return Math.max(0.18, Math.min(0.95, 0.5 + wave + pulse))
  })
}

function stemIcon(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes("vocal")) return SpeakerHigh
  if (normalized.includes("drum")) return Metronome
  if (normalized.includes("bass")) return Guitar
  return MusicNote
}

export function AudioSeparatorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<SeparatorStatus | null>(null)
  const [stems, setStems] = useState<SeparatorStem[]>([])
  const [archiveUrl, setArchiveUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [playingStems, setPlayingStems] = useState<string[]>([])
  const [volumes, setVolumes] = useState<Record<string, number>>({})

  const isProcessing = isUploading || Boolean(jobId && status?.status !== "completed" && status?.status !== "error")

  useEffect(() => {
    if (!jobId) return

    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        const response = await fetch(`/audio-separator/status/${jobId}`)
        const data = await response.json() as SeparatorStatus & { error?: string }
        if (!response.ok) throw new Error(data.error || "Unable to read separation status")
        if (cancelled) return

        setStatus(data)
        if (data.status === "completed") {
          const completedStems = data.stems || []
          setStems(completedStems)
          setArchiveUrl(data.archive_url || null)
          setVolumes(Object.fromEntries(completedStems.map((stem) => [stem.name, 75])))
          toast.success("Audio separated successfully")
          return
        }
        if (data.status === "error") {
          toast.error(data.message || "Audio separation failed")
          return
        }

        timer = window.setTimeout(poll, 1000)
      } catch (error) {
        if (cancelled) return
        setStatus({
          status: "error",
          progress: 0,
          message: error instanceof Error ? error.message : "Audio separation failed",
        })
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [jobId])

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((audio) => audio?.pause())
    }
  }, [])

  const chooseFile = (file: File) => {
    if (!isAcceptedAudio(file)) {
      toast.error("Choose an MP3, WAV, FLAC, M4A, AAC, or OGG file")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Audio files must be 50 MB or smaller")
      return
    }

    Object.values(audioRefs.current).forEach((audio) => audio?.pause())
    setSelectedFile(file)
    setJobId(null)
    setStatus(null)
    setStems([])
    setArchiveUrl(null)
    setPlayingStems([])
    setVolumes({})
  }

  const reset = () => {
    Object.values(audioRefs.current).forEach((audio) => audio?.pause())
    audioRefs.current = {}
    setSelectedFile(null)
    setJobId(null)
    setStatus(null)
    setStems([])
    setArchiveUrl(null)
    setPlayingStems([])
    setVolumes({})
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const startSeparation = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setStatus({ status: "queued", progress: 5, message: "Uploading audio..." })
    try {
      const formData = new FormData()
      formData.append("audio", selectedFile)
      const response = await fetch("/audio-separator", { method: "POST", body: formData })
      const data = await response.json() as { job_id?: string; error?: string; message?: string }
      if (!response.ok || !data.job_id) throw new Error(data.error || data.message || "Unable to start audio separation")
      setJobId(data.job_id)
      setStatus({ status: "queued", progress: 10, message: "Audio queued for separation..." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start audio separation"
      setStatus({ status: "error", progress: 0, message })
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const toggleStem = async (stemName: string) => {
    const audio = audioRefs.current[stemName]
    if (!audio) return

    if (audio.paused) {
      await audio.play()
      setPlayingStems((current) => [...new Set([...current, stemName])])
    } else {
      audio.pause()
      setPlayingStems((current) => current.filter((name) => name !== stemName))
    }
  }

  const toggleAll = async () => {
    const allPlaying = stems.length > 0 && stems.every((stem) => playingStems.includes(stem.name))
    if (allPlaying) {
      stems.forEach((stem) => audioRefs.current[stem.name]?.pause())
      setPlayingStems([])
      return
    }

    await Promise.all(stems.map(async (stem) => {
      const audio = audioRefs.current[stem.name]
      if (audio?.paused) await audio.play()
    }))
    setPlayingStems(stems.map((stem) => stem.name))
  }

  const updateVolume = (stemName: string, nextValue: number[]) => {
    const nextVolume = nextValue[0] ?? 75
    setVolumes((current) => ({ ...current, [stemName]: nextVolume }))
    const audio = audioRefs.current[stemName]
    if (audio) audio.volume = nextVolume / 100
  }

  const allPlaying = stems.length > 0 && stems.every((stem) => playingStems.includes(stem.name))
  const progress = status?.progress ?? 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <AppHeader />

      <main className="pb-8">
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
              <p className="font-semibold">Drop an audio file here or click to browse</p>
              <p className="text-sm text-muted-foreground">MP3, WAV, FLAC, M4A, AAC, or OGG up to 50 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) chooseFile(file)
              }}
              className="hidden"
            />
          </Card>
        ) : (
          <div className="space-y-5">
            <Card className="gap-6 border-2 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <FileAudio size={22} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold">{selectedFile.name}</h2>
                    <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} disabled={isProcessing} className="shrink-0 gap-2">
                  <X size={17} />
                  Clear
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {isProcessing && status ? (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium">{status.message}</span>
                      <span className="font-semibold tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div className="h-full rounded-full bg-foreground" animate={{ width: `${progress}%` }} transition={{ duration: 0.25 }} />
                    </div>
                    <p className="text-xs text-muted-foreground">The first run downloads the separation model and can take several minutes.</p>
                  </motion.div>
                ) : status?.status === "error" ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {status.message}
                  </motion.div>
                ) : stems.length === 0 ? (
                  <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Button onClick={startSeparation} size="lg" className="h-12 w-full bg-black text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white">Separate Audio</Button>
                  </motion.div>
                ) : (
                  <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle size={20} weight="fill" />
                    Four stems are ready to preview and download.
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            <AnimatePresence>
              {stems.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                  <Card className="gap-0 border-2 p-4 sm:p-6">
                    {stems.map((stem) => {
                      const Icon = stemIcon(stem.name)
                      const waveform = waveformFor(stem.name)
                      const isPlaying = playingStems.includes(stem.name)
                      const volume = volumes[stem.name] ?? 75

                      return (
                        <div key={stem.name} className="grid items-center gap-4 border-b border-border py-5 last:border-b-0 lg:grid-cols-[130px_180px_1fr_auto]">
                          <div className="flex items-center gap-3">
                            <Icon size={22} weight="fill" />
                            <span className="font-semibold">{stem.label}</span>
                          </div>
                          <StemFader value={[volume]} onValueChange={(value) => updateVolume(stem.name, value)} max={100} step={1} aria-label={`${stem.label} volume`} />
                          <button
                            type="button"
                            onClick={() => void toggleStem(stem.name)}
                            className="flex h-14 items-center gap-0.5 overflow-hidden rounded-xl bg-muted px-3 text-foreground"
                            aria-label={`${isPlaying ? "Pause" : "Play"} ${stem.label}`}
                          >
                            {waveform.map((height, index) => (
                              <span
                                key={index}
                                className="min-w-px flex-1 rounded-full bg-current transition-opacity"
                                style={{ height: `${height * volume}%`, opacity: isPlaying ? 0.75 : 0.28 }}
                              />
                            ))}
                          </button>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => void toggleStem(stem.name)} aria-label={`${isPlaying ? "Pause" : "Play"} ${stem.label}`}>
                              {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
                            </Button>
                            <Button variant="outline" size="icon" asChild aria-label={`Download ${stem.label}`}>
                              <a href={stem.download_url} download><DownloadSimple size={18} weight="bold" /></a>
                            </Button>
                            <audio
                              ref={(element) => { audioRefs.current[stem.name] = element }}
                              src={stem.url}
                              preload="metadata"
                              onEnded={() => setPlayingStems((current) => current.filter((name) => name !== stem.name))}
                            />
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <Button variant="outline" onClick={() => void toggleAll()} className="gap-2">
                        {allPlaying ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" />}
                        {allPlaying ? "Pause all" : "Play all"}
                      </Button>
                      {archiveUrl && (
                        <Button asChild className="gap-2 bg-black text-white hover:bg-black dark:bg-black dark:text-white dark:hover:bg-black">
                          <a href={archiveUrl} download>
                            <DownloadSimple size={18} weight="bold" />
                            Download all stems
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
