import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle,
  DownloadSimple,
  FileAudio,
  MusicNote,
  Pause,
  Play,
  SpeakerHigh,
  Waveform,
  X,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { AppHeader } from "@/components/AppHeader"
import { StemVolumeControl } from "@/components/StemVolumeControl"
import { StemWaveform } from "@/components/StemWaveform"
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

type StemAudioGraph = {
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
  analyser: AnalyserNode
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text()

  try {
    return JSON.parse(body) as T
  } catch {
    if (response.status === 429) {
      throw new Error("Too many requests. Please wait a moment and try again.")
    }
    if (response.status === 413) {
      throw new Error("Audio files must be 50 MB or smaller.")
    }
    throw new Error(`The server returned an unexpected response${response.status ? ` (${response.status})` : ""}. Please try again.`)
  }
}

function isAcceptedAudio(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || ""
  return file.type.startsWith("audio/") || ACCEPTED_EXTENSIONS.includes(extension)
}

function waveformFor(name: string) {
  const seed = [...name].reduce((total, character) => total + character.charCodeAt(0), 0)
  return Array.from({ length: 96 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.63) * 0.25
    const pulse = Math.sin((index + seed) * 0.19) * 0.18
    return Math.max(0.18, Math.min(0.95, 0.5 + wave + pulse))
  })
}

function stemIcon(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes("vocal")) return SpeakerHigh
  return MusicNote
}

function isPlaybackInterruption(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.message.includes("play() request was interrupted")
}

export function AudioSeparatorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioGraphsRef = useRef<Record<string, StemAudioGraph>>({})
  const playbackRequestRef = useRef(0)
  const intendsToPlayRef = useRef(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<SeparatorStatus | null>(null)
  const [stems, setStems] = useState<SeparatorStem[]>([])
  const [archiveUrl, setArchiveUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [playingStems, setPlayingStems] = useState<string[]>([])
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [currentTimes, setCurrentTimes] = useState<Record<string, number>>({})
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [analysers, setAnalysers] = useState<Record<string, AnalyserNode | null>>({})

  const isProcessing = isUploading || Boolean(jobId && status?.status !== "completed" && status?.status !== "error")

  const haltPlayback = useCallback(() => {
    playbackRequestRef.current += 1
    intendsToPlayRef.current = false
    Object.values(audioRefs.current).forEach((audio) => {
      if (!audio) return
      audio.pause()
      audio.playbackRate = 1
    })
  }, [])

  const disposeAudioGraph = useCallback(() => {
    Object.values(audioGraphsRef.current).forEach((graph) => {
      graph.source.disconnect()
      graph.analyser.disconnect()
    })
    audioGraphsRef.current = {}

    const context = audioContextRef.current
    audioContextRef.current = null
    if (context && context.state !== "closed") void context.close()
    setAnalysers({})
  }, [])

  const ensureAudioGraph = useCallback((stemName: string, audio: HTMLAudioElement) => {
    const existingGraph = audioGraphsRef.current[stemName]
    if (existingGraph?.element === audio) return existingGraph.analyser
    if (existingGraph) {
      Object.values(audioGraphsRef.current).forEach((graph) => {
        graph.source.disconnect()
        graph.analyser.disconnect()
      })
      audioGraphsRef.current = {}
      const staleContext = audioContextRef.current
      audioContextRef.current = null
      if (staleContext && staleContext.state !== "closed") void staleContext.close()
      setAnalysers({})
    }

    let context = audioContextRef.current
    if (!context || context.state === "closed") {
      context = new AudioContext()
      audioContextRef.current = context
    }

    const source = context.createMediaElementSource(audio)
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.28
    analyser.minDecibels = -96
    analyser.maxDecibels = -12
    source.connect(analyser)
    analyser.connect(context.destination)

    audioGraphsRef.current[stemName] = { element: audio, source, analyser }
    setAnalysers((current) => ({ ...current, [stemName]: analyser }))
    return analyser
  }, [])

  useEffect(() => {
    if (!jobId) return

    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        const response = await fetch(`/api/audio-separator/status/${jobId}`)
        const data = await readApiResponse<SeparatorStatus & { error?: string }>(response)
        if (!response.ok) throw new Error(data.error || data.message || "Unable to read separation status")
        if (cancelled) return

        setStatus(data)
        if (data.status === "completed") {
          const completedStems = data.stems || []
          setStems(completedStems)
          setArchiveUrl(data.archive_url || null)
          setVolumes(Object.fromEntries(completedStems.map((stem) => [stem.name, 100])))
          setCurrentTimes(Object.fromEntries(completedStems.map((stem) => [stem.name, 0])))
          setDurations(Object.fromEntries(completedStems.map((stem) => [stem.name, 0])))
          toast.success("Audio separated successfully")
          return
        }
        if (data.status === "error") {
          toast.error(data.message || "Audio separation failed")
          return
        }

        timer = window.setTimeout(poll, 3000)
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
      haltPlayback()
      Object.values(audioGraphsRef.current).forEach((graph) => {
        graph.source.disconnect()
        graph.analyser.disconnect()
      })
      const context = audioContextRef.current
      if (context && context.state !== "closed") void context.close()
    }
  }, [haltPlayback])

  useEffect(() => {
    if (playingStems.length === 0) return

    let animationFrame = 0
    let lastUpdate = 0
    let lastCorrection = 0
    const syncPlayheads = (timestamp: number) => {
      const referenceAudio = audioRefs.current[playingStems[0]]
      const referenceTime = referenceAudio?.currentTime

      if (referenceAudio && referenceTime !== undefined && timestamp - lastCorrection >= 250) {
        lastCorrection = timestamp
        playingStems.slice(1).forEach((stemName) => {
          const audio = audioRefs.current[stemName]
          if (!audio || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
          if (Math.abs(audio.currentTime - referenceTime) > 0.018) {
            audio.currentTime = referenceTime
          }
        })
      }

      if (timestamp - lastUpdate >= 50) {
        lastUpdate = timestamp
        setCurrentTimes((current) => {
          const next = { ...current }
          playingStems.forEach((stemName) => {
            const audio = audioRefs.current[stemName]
            if (audio) next[stemName] = audio.currentTime
          })
          return next
        })
      }
      animationFrame = window.requestAnimationFrame(syncPlayheads)
    }

    animationFrame = window.requestAnimationFrame(syncPlayheads)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [playingStems])

  const chooseFile = (file: File) => {
    if (!isAcceptedAudio(file)) {
      toast.error("Choose an MP3, WAV, FLAC, M4A, AAC, or OGG file")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Audio files must be 50 MB or smaller")
      return
    }

    haltPlayback()
    disposeAudioGraph()
    setSelectedFile(file)
    setJobId(null)
    setStatus(null)
    setStems([])
    setArchiveUrl(null)
    setPlayingStems([])
    setVolumes({})
    setCurrentTimes({})
    setDurations({})
  }

  const reset = () => {
    haltPlayback()
    disposeAudioGraph()
    audioRefs.current = {}
    setSelectedFile(null)
    setJobId(null)
    setStatus(null)
    setStems([])
    setArchiveUrl(null)
    setPlayingStems([])
    setVolumes({})
    setCurrentTimes({})
    setDurations({})
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const startSeparation = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setStatus({ status: "queued", progress: 5, message: "Uploading audio..." })
    try {
      const formData = new FormData()
      formData.append("audio", selectedFile)
      const response = await fetch("/api/audio-separator", { method: "POST", body: formData })
      const data = await readApiResponse<{ job_id?: string; error?: string; message?: string }>(response)
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

  const toggleAll = async () => {
    const allPlaying = stems.length > 0 && stems.every((stem) => playingStems.includes(stem.name))
    if (intendsToPlayRef.current || allPlaying) {
      haltPlayback()
      setPlayingStems([])
      return
    }

    const requestId = playbackRequestRef.current + 1
    playbackRequestRef.current = requestId
    intendsToPlayRef.current = true

    const referenceStemName = stems[0]?.name
    const referenceAudio = referenceStemName ? audioRefs.current[referenceStemName] : null
    const referenceTime = referenceAudio
      && Number.isFinite(referenceAudio.duration)
      && referenceAudio.duration - referenceAudio.currentTime > 0.15
      ? referenceAudio.currentTime
      : 0

    try {
      stems.forEach((stem) => {
        const audio = audioRefs.current[stem.name]
        if (!audio) return
        ensureAudioGraph(stem.name, audio)
        audio.currentTime = referenceTime
        audio.playbackRate = 1
      })

      const context = audioContextRef.current
      if (context?.state === "suspended") await context.resume()

      if (requestId !== playbackRequestRef.current || !intendsToPlayRef.current) return

      setPlayingStems(stems.map((stem) => stem.name))
      const playResults = await Promise.allSettled(stems.map((stem) => {
        const audio = audioRefs.current[stem.name]
        if (!audio) return Promise.reject(new Error(`${stem.label} audio is unavailable`))
        return audio.paused ? audio.play() : Promise.resolve()
      }))

      if (requestId !== playbackRequestRef.current || !intendsToPlayRef.current) return

      const failedPlayback = playResults.find((result) => result.status === "rejected")
      if (failedPlayback?.status === "rejected") throw failedPlayback.reason

      const synchronizedTime = Math.max(
        referenceTime,
        ...stems.map((stem) => audioRefs.current[stem.name]?.currentTime ?? referenceTime),
      )
      stems.forEach((stem) => {
        const audio = audioRefs.current[stem.name]
        if (audio) audio.currentTime = synchronizedTime
      })
    } catch (error) {
      if (requestId !== playbackRequestRef.current || !intendsToPlayRef.current) return

      haltPlayback()
      setPlayingStems([])
      if (!isPlaybackInterruption(error)) {
        toast.error(error instanceof Error ? error.message : "Unable to play the separated audio")
      }
    }
  }

  const updateVolume = (stemName: string, nextVolume: number) => {
    setVolumes((current) => ({ ...current, [stemName]: nextVolume }))
    const audio = audioRefs.current[stemName]
    if (audio) audio.volume = nextVolume / 100
  }

  const seekAll = (time: number) => {
    const nextTimes: Record<string, number> = {}
    stems.forEach((stem) => {
      const audio = audioRefs.current[stem.name]
      const nextTime = audio && Number.isFinite(audio.duration)
        ? Math.min(time, audio.duration)
        : time
      if (audio) audio.currentTime = nextTime
      if (audio) audio.playbackRate = 1
      nextTimes[stem.name] = nextTime
    })
    setCurrentTimes((current) => ({ ...current, ...nextTimes }))
  }

  const allPlaying = stems.length > 0 && stems.every((stem) => playingStems.includes(stem.name))
  const progress = status?.progress ?? 0

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
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
              <Waveform size={34} weight="bold" />
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
                    <p className="text-xs text-muted-foreground">Quality-first vocal separation uses a specialist GPU model and may take a moment while the GPU starts.</p>
                  </motion.div>
                ) : status?.status === "error" ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {status.message}
                  </motion.div>
                ) : stems.length === 0 ? (
                  <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Button onClick={startSeparation} size="lg" className="h-12 w-full bg-foreground text-background hover:bg-foreground/90">Separate Audio</Button>
                  </motion.div>
                ) : (
                  <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle size={20} weight="fill" />
                    Vocals and Music are ready to preview and download.
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
                      const volume = volumes[stem.name] ?? 100
                      const currentTime = currentTimes[stem.name] ?? 0
                      const duration = durations[stem.name] ?? 0

                      return (
                        <div key={stem.name} className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-4 border-b border-border py-5 last:border-b-0 lg:grid-cols-[120px_210px_minmax(0,1fr)_auto]">
                          <div className="flex items-center gap-3">
                            <Icon size={22} weight="fill" />
                            <span className="font-semibold">{stem.label}</span>
                          </div>
                          <StemVolumeControl
                            label={stem.label}
                            value={volume}
                            onChange={(value) => updateVolume(stem.name, value)}
                          />
                          <StemWaveform
                            label={stem.label}
                            response={stem.name.toLowerCase().includes("music") ? "music" : "voice"}
                            waveform={waveform}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            analyser={analysers[stem.name] ?? null}
                            onSeek={seekAll}
                          />
                          <div className="flex items-center gap-2 lg:justify-end">
                            <Button variant="outline" size="icon" asChild aria-label={`Download ${stem.label}`}>
                              <a href={stem.download_url} download><DownloadSimple size={18} weight="bold" /></a>
                            </Button>
                            <audio
                              key={`rhythm-gated:${stem.url}`}
                              ref={(element) => { audioRefs.current[stem.name] = element }}
                              src={stem.url}
                              preload="metadata"
                              onLoadedMetadata={(event) => {
                                const audio = event.currentTarget
                                const nextDuration = audio.duration
                                const nextTime = audio.currentTime
                                audio.volume = volume / 100
                                setDurations((current) => ({ ...current, [stem.name]: nextDuration }))
                                setCurrentTimes((current) => ({ ...current, [stem.name]: nextTime }))
                              }}
                              onTimeUpdate={(event) => {
                                if (!isPlaying) {
                                  const nextTime = event.currentTarget.currentTime
                                  setCurrentTimes((current) => ({ ...current, [stem.name]: nextTime }))
                                }
                              }}
                              onEnded={() => {
                                const endTimes: Record<string, number> = {}
                                haltPlayback()
                                stems.forEach((currentStem) => {
                                  const audio = audioRefs.current[currentStem.name]
                                  if (!audio) return
                                  if (Number.isFinite(audio.duration)) {
                                    audio.currentTime = audio.duration
                                    endTimes[currentStem.name] = audio.duration
                                  }
                                })
                                setCurrentTimes((current) => ({ ...current, ...endTimes }))
                                setPlayingStems([])
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
                      <Button variant="outline" onClick={() => void toggleAll()} className="gap-2">
                        {allPlaying ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" />}
                        {allPlaying ? "Pause" : "Play"}
                      </Button>
                      {archiveUrl && (
                        <Button asChild className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                          <a href={archiveUrl} download>
                            <DownloadSimple size={18} weight="bold" />
                            Download
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
