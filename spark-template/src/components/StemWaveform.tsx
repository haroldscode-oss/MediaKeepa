import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"

type StemWaveformProps = {
  label: string
  response: "music" | "voice"
  waveform: number[]
  currentTime: number
  duration: number
  isPlaying: boolean
  analyser: AnalyserNode | null
  onSeek: (time: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function StemWaveform({
  label,
  response,
  waveform,
  currentTime,
  duration,
  isPlaying,
  analyser,
  onSeek,
}: StemWaveformProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const barRefs = useRef<Array<HTMLSpanElement | null>>([])
  const animationFrameRef = useRef<number | null>(null)
  const progressRef = useRef(0)
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0
  progressRef.current = progress

  useEffect(() => {
    const resetBars = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      barRefs.current.forEach((bar) => {
        if (bar) bar.style.transform = "scaleY(1)"
      })
    }

    if (!analyser || !isPlaying || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      resetBars()
      return
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    const previousSpectrum = new Uint8Array(analyser.frequencyBinCount)
    const kickHistory: number[] = []
    const snareHistory: number[] = []
    const drumHistory: number[] = []
    const musicHistory: number[] = []
    const hertzPerBin = analyser.context.sampleRate / analyser.fftSize
    let previousKick = 0
    let previousSnare = 0
    let previousDrum = 0
    let previousMusic = 0
    let kickPulse = 0
    let snarePulse = 0
    let drumPulse = 0
    let musicAccentPulse = 0
    let bassBodyEnvelope = 0
    let musicBodyEnvelope = 0
    let kickHoldUntil = 0
    let snareHoldUntil = 0
    let drumHoldUntil = 0
    let musicHoldUntil = 0
    let voiceEnvelope = 0
    let lastKickAt = 0
    let lastSnareAt = 0
    let lastDrumAt = 0
    let lastMusicAt = 0

    const averageBand = (startHertz: number, endHertz: number) => {
      const startBin = clamp(Math.floor(startHertz / hertzPerBin), 1, frequencyData.length - 1)
      const endBin = clamp(Math.ceil(endHertz / hertzPerBin), startBin + 1, frequencyData.length)
      let total = 0
      for (let index = startBin; index < endBin; index += 1) {
        total += frequencyData[index]
      }
      return total / Math.max(1, endBin - startBin) / 255
    }

    const drawSpectrum = () => {
      analyser.getByteFrequencyData(frequencyData)

      const kickEnergy = averageBand(42, 145)
      const bassEnergy = averageBand(35, 230)
      const snareBody = averageBand(150, 320)
      const snareCrack = averageBand(1800, 5200)
      const snareEnergy = snareBody * 0.38 + snareCrack * 0.62
      const drumBody = averageBand(80, 650)
      const drumTop = averageBand(5000, 12000)
      const drumEnergy = drumBody * 0.45 + drumTop * 0.55
      const fullMusicEnergy = averageBand(35, 14000)
      const voiceEnergy = averageBand(180, 4200)

      const positiveFlux = (startHertz: number, endHertz: number) => {
        const startBin = clamp(Math.floor(startHertz / hertzPerBin), 1, frequencyData.length - 1)
        const endBin = clamp(Math.ceil(endHertz / hertzPerBin), startBin + 1, frequencyData.length)
        let flux = 0
        for (let index = startBin; index < endBin; index += 1) {
          flux += Math.max(0, frequencyData[index] - previousSpectrum[index]) / 255
        }
        return flux / Math.max(1, endBin - startBin)
      }

      const kickFlux = positiveFlux(35, 210)
      const snareFlux = positiveFlux(700, 6200)
      const drumFlux = positiveFlux(250, 12000)
      const fullMusicFlux = positiveFlux(35, 14000)
      previousSpectrum.set(frequencyData)

      const kickBaseline = kickHistory.length > 0
        ? kickHistory.reduce((total, value) => total + value, 0) / kickHistory.length
        : Math.max(0.045, kickEnergy * 0.82)
      const snareBaseline = snareHistory.length > 0
        ? snareHistory.reduce((total, value) => total + value, 0) / snareHistory.length
        : Math.max(0.04, snareEnergy * 0.84)
      const drumBaseline = drumHistory.length > 0
        ? drumHistory.reduce((total, value) => total + value, 0) / drumHistory.length
        : Math.max(0.04, drumEnergy * 0.84)
      const musicBaseline = musicHistory.length > 0
        ? musicHistory.reduce((total, value) => total + value, 0) / musicHistory.length
        : Math.max(0.04, fullMusicEnergy * 0.86)
      kickHistory.push(kickEnergy)
      snareHistory.push(snareEnergy)
      drumHistory.push(drumEnergy)
      musicHistory.push(fullMusicEnergy)
      if (kickHistory.length > 42) kickHistory.shift()
      if (snareHistory.length > 42) snareHistory.shift()
      if (drumHistory.length > 42) drumHistory.shift()
      if (musicHistory.length > 42) musicHistory.shift()

      const relativeKickSurge = Math.max(0, (kickEnergy - kickBaseline) / (kickBaseline + 0.04))
      const relativeSnareSurge = Math.max(0, (snareEnergy - snareBaseline) / (snareBaseline + 0.04))
      const relativeDrumSurge = Math.max(0, (drumEnergy - drumBaseline) / (drumBaseline + 0.04))
      const relativeMusicSurge = Math.max(0, (fullMusicEnergy - musicBaseline) / (musicBaseline + 0.04))
      const kickAttack = Math.max(0, kickEnergy - previousKick)
      const snareAttack = Math.max(0, snareEnergy - previousSnare)
      const drumAttack = Math.max(0, drumEnergy - previousDrum)
      const musicAttack = Math.max(0, fullMusicEnergy - previousMusic)
      const kickScore = relativeKickSurge * 1.1 + kickAttack * 5.2 + kickFlux * 4.5
      const snareScore = relativeSnareSurge + snareAttack * 5.5 + snareFlux * 4.8
      const drumScore = relativeDrumSurge * 0.85 + drumAttack * 4.2 + drumFlux * 5.5
      const musicScore = relativeMusicSurge * 0.65 + musicAttack * 3.2 + fullMusicFlux * 4
      const now = performance.now()
      if (response === "music" && kickScore > 0.6 && now - lastKickAt > 140) {
        kickPulse = Math.max(kickPulse, clamp(0.55 + (kickScore - 0.6) * 0.75, 0, 1.25))
        kickHoldUntil = now + 65
        lastKickAt = now
      } else if (now > kickHoldUntil) {
        kickPulse *= 0.85
      }
      if (response === "music" && snareScore > 1.4 && now - lastSnareAt > 120) {
        snarePulse = Math.max(snarePulse, clamp(0.28 + (snareScore - 1.4) * 0.25, 0, 0.6))
        snareHoldUntil = now + 35
        lastSnareAt = now
      } else if (now > snareHoldUntil) {
        snarePulse *= 0.74
      }
      if (response === "music" && drumScore > 2.2 && now - lastDrumAt > 85) {
        drumPulse = Math.max(drumPulse, clamp(0.18 + (drumScore - 2.2) * 0.11, 0, 0.42))
        drumHoldUntil = now + 20
        lastDrumAt = now
      } else if (now > drumHoldUntil) {
        drumPulse *= 0.68
      }
      const rhythmConfidence = clamp(Math.max(
        kickPulse / 1.25,
        snarePulse / 0.6,
        drumPulse / 0.42,
      ), 0, 1)
      if (response === "music" && musicScore > 2 && now - lastMusicAt > 130) {
        const gatedAccent = clamp(0.12 + (musicScore - 2) * 0.18, 0, 0.38)
          * (0.35 + rhythmConfidence * 0.65)
        musicAccentPulse = Math.max(musicAccentPulse, gatedAccent)
        musicHoldUntil = now + 45
        lastMusicAt = now
      } else if (now > musicHoldUntil) {
        musicAccentPulse *= 0.8
      }
      previousKick = kickEnergy
      previousSnare = snareEnergy
      previousDrum = drumEnergy
      previousMusic = fullMusicEnergy

      const bassBodyTarget = clamp((bassEnergy - 0.18) / 0.62, 0, 1)
      bassBodyEnvelope = bassBodyTarget > bassBodyEnvelope
        ? bassBodyEnvelope * 0.42 + bassBodyTarget * 0.58
        : bassBodyEnvelope * 0.92 + bassBodyTarget * 0.08
      const musicBodyTarget = clamp((fullMusicEnergy - 0.05) / 0.35, 0, 1)
      musicBodyEnvelope = musicBodyTarget > musicBodyEnvelope
        ? musicBodyEnvelope * 0.75 + musicBodyTarget * 0.25
        : musicBodyEnvelope * 0.94 + musicBodyTarget * 0.06

      const normalizedVoice = clamp((voiceEnergy - 0.04) / 0.6, 0, 1)
      voiceEnvelope = normalizedVoice > voiceEnvelope
        ? voiceEnvelope * 0.28 + normalizedVoice * 0.72
        : voiceEnvelope * 0.82 + normalizedVoice * 0.18
      const barCount = barRefs.current.length
      const activeBar = Math.round(progressRef.current * Math.max(0, barCount - 1))
      const spectrumStart = response === "music" ? 42 : 180
      const spectrumEnd = response === "music" ? 8000 : 5200
      const spectrumStartBin = clamp(Math.floor(spectrumStart / hertzPerBin), 1, frequencyData.length - 1)
      const spectrumEndBin = clamp(Math.ceil(spectrumEnd / hertzPerBin), spectrumStartBin + 1, frequencyData.length)

      barRefs.current.forEach((bar, index) => {
        if (!bar) return

        const spectrumCycle = index % 32
        const mirroredSpectrumPosition = spectrumCycle <= 16
          ? spectrumCycle / 16
          : (32 - spectrumCycle) / 16
        const frequencyIndex = Math.min(
          spectrumEndBin - 1,
          spectrumStartBin + Math.floor(mirroredSpectrumPosition * (spectrumEndBin - spectrumStartBin)),
        )
        const frequencyEnergy = frequencyData[frequencyIndex] / 255
        const distanceFromPlayhead = Math.abs(index - activeBar)
        const playheadFocus = Math.exp(-distanceFromPlayhead / 8)
        const kickFocus = Math.exp(-distanceFromPlayhead / 6)
        const snareFocus = Math.exp(-distanceFromPlayhead / 4)
        const drumFocus = Math.exp(-distanceFromPlayhead / 3)
        const musicFocus = Math.exp(-distanceFromPlayhead / 5)
        const scale = response === "music"
          ? clamp(
              0.64
                + bassBodyEnvelope * 0.14
                + musicBodyEnvelope * 0.12
                + kickPulse * (0.08 + kickFocus * 1.15)
                + snarePulse * (0.04 + snareFocus * 0.62)
                + drumPulse * (0.03 + drumFocus * 0.42)
                + musicAccentPulse * (0.02 + musicFocus * 0.32),
              0.68,
              2.45,
            )
          : clamp(
              0.58
                + frequencyEnergy * 0.42
                + voiceEnvelope * (0.32 + playheadFocus * 0.48),
              0.55,
              1.82,
            )

        bar.style.transform = `scaleY(${scale.toFixed(3)})`
      })

      animationFrameRef.current = window.requestAnimationFrame(drawSpectrum)
    }

    animationFrameRef.current = window.requestAnimationFrame(drawSpectrum)
    return resetBars
  }, [analyser, isPlaying, response])

  const timeFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const percentage = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    return percentage * duration
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!duration) return

    let nextTime: number | null = null
    if (event.key === "ArrowLeft") nextTime = currentTime - 5
    if (event.key === "ArrowRight") nextTime = currentTime + 5
    if (event.key === "Home") nextTime = 0
    if (event.key === "End") nextTime = duration
    if (nextTime === null) return

    event.preventDefault()
    onSeek(clamp(nextTime, 0, duration))
  }

  return (
    <div className="min-w-0 w-full">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} timeline`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.floor(duration))}
        aria-valuenow={Math.floor(currentTime)}
        aria-valuetext={`${formatAudioTime(currentTime)} of ${formatAudioTime(duration)}`}
        className="group relative cursor-pointer rounded-xl bg-muted/75 px-3 py-3 outline-none ring-offset-background transition-shadow hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => duration && onSeek(timeFromPointer(event))}
        onMouseMove={(event) => duration && setHoverTime(timeFromPointer(event))}
        onMouseLeave={() => setHoverTime(null)}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex h-20 items-center gap-[2px] overflow-hidden sm:h-24">
          {waveform.map((height, index) => {
            const barPosition = (index + 0.5) / waveform.length
            const hasPlayed = barPosition <= progress
            const activeBar = Math.round(progress * (waveform.length - 1))
            const distanceFromPlayhead = Math.abs(index - activeBar)
            const isActive = isPlaying && distanceFromPlayhead <= 2

            return (
              <span
                key={index}
                ref={(element) => { barRefs.current[index] = element }}
                className={`min-w-px flex-1 rounded-full transition-[background-color,opacity] duration-75 will-change-transform ${hasPlayed || isActive ? "bg-foreground" : "bg-foreground/20"}`}
                style={{
                  height: `${Math.round(height * 48 + 18)}%`,
                  transformOrigin: "center",
                  opacity: isActive ? 1 : hasPlayed ? 0.92 : 0.55,
                }}
              />
            )
          })}

          {hoverTime !== null && duration > 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-background shadow-sm"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {formatAudioTime(hoverTime)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
        <span>{formatAudioTime(currentTime)}</span>
        <span>{formatAudioTime(duration)}</span>
      </div>
    </div>
  )
}
