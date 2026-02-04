import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import ShinyText from "@/components/ShinyText"
import PixelBlast from "@/components/PixelBlast"
import Ballpit from "@/components/Ballpit"

const MIN_SCALE = 0.4

function randomInView() {
  return { x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 }
}

function nextId() {
  return Math.random().toString(36).slice(2)
}

type NoButton = {
  id: string
  x: number
  y: number
  scale: number
  isDecoy: boolean
  shrinkCount: number
}

type Action = "move" | "shrink" | "duplicate"

const ACTIONS: Action[] = ["move", "shrink", "duplicate"]

function pickRandomAction(): Action {
  return ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
}

const BERSERK_THRESHOLD = 5
const DEBUG_BERSERK = false // DEBUG: berserk al primo click No, una sola wave con 1 pulsante

// --- Berserk minigame ---
const COUNTDOWN_SECONDS = 3
const WAVE_DURATION_SEC = 6
const SPAWN_WINDOW_PER_WAVE_SEC = 5 // wave 1: 5s, wave 2: 10s, wave 3: 15s...
const TARGET_CENTER = { x: 50, y: 50 }

function easeOutStrong(t: number): number {
  const s = 1 - t
  return 1 - s * s * s * s
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

type GamePhase = "countdown" | "wave" | "betweenWaves" | "gameover"

type WaveNoButton = {
  id: string
  startX: number
  startY: number
  spawnDelay: number // secondi dopo l'inizio della wave prima di partire
}

function spawnWaveNoButtons(count: number, wave: number): WaveNoButton[] {
  const spawnWindowSec = wave * SPAWN_WINDOW_PER_WAVE_SEC
  const result: WaveNoButton[] = []
  const delays: number[] = []
  for (let i = 0; i < count; i++) {
    delays.push(Math.random() * spawnWindowSec)
  }
  delays.sort((a, b) => a - b)
  delays[0] = 0
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4)
    let startX: number, startY: number
    if (side === 0) {
      startX = 0
      startY = 10 + Math.random() * 80
    } else if (side === 1) {
      startX = 100
      startY = 10 + Math.random() * 80
    } else if (side === 2) {
      startX = 10 + Math.random() * 80
      startY = 0
    } else {
      startX = 10 + Math.random() * 80
      startY = 100
    }
    result.push({
      id: nextId(),
      startX,
      startY,
      spawnDelay: delays[i],
    })
  }
  return result
}

function waveNoCount(wave: number): number {
  return wave * 10
}

export default function Home() {
  const [saidYes, setSaidYes] = useState(false)
  const [floatingNos, setFloatingNos] = useState<NoButton[]>([])
  const [realNoClicks, setRealNoClicks] = useState(0)
  const berserk = realNoClicks > (DEBUG_BERSERK ? 0 : BERSERK_THRESHOLD)

  // Berserk minigame state
  const [gamePhase, setGamePhase] = useState<GamePhase | null>(null)
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_SECONDS)
  const [currentWave, setCurrentWave] = useState(0)
  const [waveNoButtons, setWaveNoButtons] = useState<WaveNoButton[]>([])
  const [gameStartTime, setGameStartTime] = useState(0)
  const [gameOverWave, setGameOverWave] = useState(0)
  const [gameOverTime, setGameOverTime] = useState(0)
  const [waveStartTime, setWaveStartTime] = useState(0)

  const gameStartedRef = useRef(false)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animationRef = useRef<number | null>(null)
  const waveNoButtonsRef = useRef<WaveNoButton[]>([])
  const waveProgressRef = useRef<Record<string, number>>({})
  const waveButtonElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const yesButtonRef = useRef<HTMLButtonElement | null>(null)
  const [animationTick, setAnimationTick] = useState(0)
  const currentWaveRef = useRef(0)
  const gameStartTimeRef = useRef(0)
  waveNoButtonsRef.current = waveNoButtons
  currentWaveRef.current = currentWave
  gameStartTimeRef.current = gameStartTime

  useEffect(() => {
    if (berserk) setFloatingNos([])
  }, [berserk])

  // Start minigame when berserk activates
  useEffect(() => {
    if (!berserk) {
      gameStartedRef.current = false
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }
    if (gameStartedRef.current) return
    gameStartedRef.current = true
    const startTime = Date.now()
    setGamePhase("countdown")
    setCountdownValue(COUNTDOWN_SECONDS)
    setCurrentWave(0)
    setWaveNoButtons([])
    setGameStartTime(startTime)
    gameStartTimeRef.current = startTime
    setGameOverWave(0)
    setGameOverTime(0)
  }, [berserk])

  // Countdown ticker (initial 3, 2, 1 and between-waves)
  useEffect(() => {
    if (gamePhase !== "countdown" && gamePhase !== "betweenWaves") return
    const isInitial = gamePhase === "countdown"
    const nextWave = isInitial ? 1 : currentWave + 1
    setCountdownValue(COUNTDOWN_SECONDS)
    let v = COUNTDOWN_SECONDS
    const id = setInterval(() => {
      v -= 1
      setCountdownValue(v)
      if (v <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        const start = performance.now()
        setWaveStartTime(start)
        setCurrentWave(nextWave)
        const count = DEBUG_BERSERK ? 1 : waveNoCount(nextWave)
        setWaveNoButtons(spawnWaveNoButtons(count, nextWave))
        setGamePhase("wave")
      }
    }, 1000)
    countdownIntervalRef.current = id
    return () => {
      clearInterval(id)
      countdownIntervalRef.current = null
    }
  }, [gamePhase, currentWave])

  // Wave animation: progress in ref + 1 setState/frame così posizione e hover non si bloccano
  useEffect(() => {
    if (gamePhase !== "wave" || waveNoButtons.length === 0) return
    waveProgressRef.current = {}
    const waveStart = waveStartTime > 0 ? waveStartTime : performance.now()
    const tick = (now: number) => {
      const elapsedSec = (now - waveStart) / 1000
      const buttons = waveNoButtonsRef.current
      if (buttons.length === 0) {
        return
      }
      const yesRect = yesButtonRef.current?.getBoundingClientRect()
      let hitCenter = false
      for (const b of buttons) {
        const effectiveElapsed = Math.max(0, elapsedSec - b.spawnDelay)
        const rawProgress = Math.min(1, effectiveElapsed / WAVE_DURATION_SEC)
        const progress = easeOutStrong(rawProgress)
        const x = b.startX + (TARGET_CENTER.x - b.startX) * progress
        const y = b.startY + (TARGET_CENTER.y - b.startY) * progress
        waveProgressRef.current[b.id] = progress
        const el = waveButtonElementsRef.current.get(b.id)
        if (el) {
          el.style.left = `${x}%`
          el.style.top = `${y}%`
          el.style.transform = "translate(-50%, -50%)"
          if (yesRect) {
            const noRect = el.getBoundingClientRect()
            if (rectsOverlap(yesRect, noRect)) hitCenter = true
          }
        }
      }
      if (hitCenter) {
        setGameOverWave(currentWaveRef.current)
        setGameOverTime((Date.now() - gameStartTimeRef.current) / 1000)
        setGamePhase("gameover")
        setWaveNoButtons([])
        waveProgressRef.current = {}
        if (animationRef.current != null) cancelAnimationFrame(animationRef.current)
        animationRef.current = null
        return
      }
      setAnimationTick((t) => t + 1)
      animationRef.current = requestAnimationFrame(tick)
    }
    animationRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [gamePhase, waveNoButtons.length, waveStartTime])

  // When all wave No buttons are clicked (removed), go to betweenWaves or next wave
  useEffect(() => {
    if (gamePhase !== "wave") return
    if (waveNoButtons.length > 0) return
    setGamePhase("betweenWaves")
  }, [gamePhase, waveNoButtons.length])

  const removeWaveNo = useCallback((id: string) => {
    setWaveNoButtons((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const handleNoFromBox = useCallback(() => {
    setFloatingNos([
      { id: nextId(), ...randomInView(), scale: 1, isDecoy: false, shrinkCount: 0 },
    ])
  }, [])

  const handleRealNoClick = useCallback((id: string) => {
    setRealNoClicks((n) => n + 1)
    setFloatingNos((prev) => {
      const btn = prev.find((b) => b.id === id)
      if (!btn || btn.isDecoy) return prev
      const action = pickRandomAction()
      if (action === "move") {
        const pos = randomInView()
        const reset = btn.shrinkCount >= 2
        return prev.map((b) =>
          b.id === id
            ? {
              ...b,
              ...pos,
              ...(reset ? { scale: 1, shrinkCount: 0 } : {}),
            }
            : b
        )
      }
      if (action === "shrink") {
        const pos = randomInView()
        const newScale = Math.max(MIN_SCALE, btn.scale * 0.85)
        return prev.map((b) =>
          b.id === id
            ? { ...b, ...pos, scale: newScale, shrinkCount: btn.shrinkCount + 1 }
            : b
        )
      }
      // duplicate: remove this, add two (entrambi si spostano già in pos random)
      const pos1 = randomInView()
      const pos2 = randomInView()
      const realFirst = Math.random() < 0.5
      const two: NoButton[] = [
        {
          id: nextId(),
          ...pos1,
          scale: btn.scale,
          isDecoy: realFirst,
          shrinkCount: btn.shrinkCount,
        },
        {
          id: nextId(),
          ...pos2,
          scale: btn.scale,
          isDecoy: !realFirst,
          shrinkCount: btn.shrinkCount,
        },
      ]
      return prev.filter((b) => b.id !== id).concat(two)
    })
  }, [])

  const handleDecoyClick = useCallback((id: string) => {
    setFloatingNos((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const handleFloatingNoClick = useCallback(
    (btn: NoButton) => {
      if (btn.isDecoy) handleDecoyClick(btn.id)
      else handleRealNoClick(btn.id)
    },
    [handleDecoyClick, handleRealNoClick]
  )

  const showNoInBox = floatingNos.length === 0

  return (
    <div
      className={`min-h-svh flex flex-col items-center justify-center text-foreground relative transition-colors duration-500 ${
        berserk ? "bg-black text-white" : "bg-background"
      }`}
    >
      <div className="z-10 rounded-2xl border border-white/20 bg-white/10 px-8 py-6 shadow-xl backdrop-blur-md">
        {saidYes ? (
          <ShinyText
            text="Love you 💕"
            speed={2}
            delay={0}
            color="#ff78e4"
            shineColor="#db0d30"
            spread={120}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            disabled={false}
          />
        ) : berserk && gamePhase === "gameover" ? (
          <div className="text-center">
            <p className="text-xl font-bold text-red-400">Game Over</p>
            <p className="mt-2 text-gray-300">Wave {gameOverWave}</p>
            <p className="text-gray-300">Time: {gameOverTime.toFixed(1)}s</p>
          </div>
        ) : berserk ? (
          <div className="flex justify-center">
            <Button
              ref={yesButtonRef}
              variant="outline"
              size="default"
              disabled
              onClick={() => {
                setSaidYes(true)
                setFloatingNos([])
              }}
            >
              <ShinyText
                text="✨ Yes"
                speed={2}
                delay={0}
                color="#330029"
                shineColor="#ff78e4"
                spread={120}
                direction="left"
                yoyo={false}
                pauseOnHover={false}
                disabled={false}
              />
            </Button>
          </div>
        ) : (
          <>
            <h3 className="text-1xl font-bold text-gray-700">Will you be my valentine?</h3>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                size="default"
                className="w-1/2"
                onClick={() => {
                  setSaidYes(true)
                  setFloatingNos([])
                }}
              >
                <ShinyText
                  text="✨ Yes"
                  speed={2}
                  delay={0}
                  color="#330029"
                  shineColor="#ff78e4"
                  spread={120}
                  direction="left"
                  yoyo={false}
                  pauseOnHover={false}
                  disabled={false}
                />
              </Button>
              {showNoInBox ? (
                <Button
                  variant="outline"
                  size="default"
                  className="w-1/2 border-red-200"
                  onClick={handleNoFromBox}
                >
                  No
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>

      {!berserk &&
        floatingNos.map((btn) => (
          <Button
            key={btn.id}
            variant="outline"
            size="default"
            className="fixed z-20 border-red-200 transition-transform"
            style={{
              left: `${btn.x}%`,
              top: `${btn.y}%`,
              transform: `translate(-50%, -50%) scale(${btn.scale})`,
            }}
            onClick={() => handleFloatingNoClick(btn)}
          >
            No
          </Button>
        ))}

      {/* Berserk: countdown overlay (initial or between waves) */}
      {berserk && (gamePhase === "countdown" || gamePhase === "betweenWaves") && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <p className="text-6xl font-bold text-white tabular-nums">
            {gamePhase === "countdown"
              ? countdownValue > 0
                ? countdownValue
                : "Go!"
              : countdownValue > 0
                ? `Wave ${currentWave + 1} in ${countdownValue}`
                : "Go!"}
          </p>
        </div>
      )}

      {/* Berserk: wave No - posizione aggiornata direttamente nel DOM (rAF) così non dipende da re-render React */}
      {berserk && gamePhase === "wave" && (
        <div className="pointer-events-none fixed inset-0 z-[100]">
          {waveNoButtons.map((btn) => (
            <Button
              key={btn.id}
              ref={(el) => {
                if (el) waveButtonElementsRef.current.set(btn.id, el)
                else waveButtonElementsRef.current.delete(btn.id)
              }}
              variant="outline"
              size="default"
              className="pointer-events-auto absolute border-2 border-red-400 bg-red-600 text-white shadow-lg"
              style={{
                left: `${btn.startX}%`,
                top: `${btn.startY}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => removeWaveNo(btn.id)}
            >
              No
            </Button>
          ))}
        </div>
      )}

      {/* DEBUG: valori in tempo reale (solo con DEBUG_BERSERK e in wave) */}
      {DEBUG_BERSERK && berserk && gamePhase === "wave" && waveNoButtons[0] && (() => {
        const progress = waveProgressRef.current[waveNoButtons[0].id] ?? 0
        const x = waveNoButtons[0].startX + (TARGET_CENTER.x - waveNoButtons[0].startX) * progress
        const y = waveNoButtons[0].startY + (TARGET_CENTER.y - waveNoButtons[0].startY) * progress
        return (
          <div className="fixed bottom-4 left-4 z-[110] rounded bg-black/90 p-3 font-mono text-xs text-green-400">
            <div>progress: {(progress * 100).toFixed(1)}%</div>
            <div>x: {x.toFixed(1)}% | y: {y.toFixed(1)}%</div>
            <div className="text-white/50">hit quando No e Yes si sovrappongono (getBoundingClientRect)</div>
            <div className="text-white/50">tick {animationTick}</div>
          </div>
        )
      })()}


      {!saidYes && (
        <>
          <div className="absolute inset-0 z-0 h-full w-full">
            <PixelBlast
              variant="square"
              pixelSize={4}
              color={berserk ? "#ff0000" : "#ff78f4"}
              patternScale={2}
              patternDensity={1}
              pixelSizeJitter={0}
              enableRipples
              rippleSpeed={0.4}
              rippleThickness={0.12}
              rippleIntensityScale={1.5}
              liquid={false}
              speed={2}
              edgeFade={0.25}
              transparent
            />
          </div>
          <div className="absolute inset-0 z-0 h-full w-full">
            <PixelBlast
              variant="square"
              pixelSize={5}
              color={berserk ? "#cc0000" : "#ff78e4"}
              patternScale={2}
              patternDensity={1}
              pixelSizeJitter={0}
              enableRipples
              rippleSpeed={0.1}
              rippleThickness={0.12}
              rippleIntensityScale={1.5}
              liquid={false}
              speed={2}
              edgeFade={1}
              transparent
            />
          </div>
        </>
      )}

      {saidYes && (
        <div className="fixed inset-0 z-0 h-svh w-full overflow-hidden">
          <Ballpit
            count={100}
            gravity={-0.05}
            friction={0.9975}
            wallBounce={0.95}
            followCursor={false}
          />
        </div>
      )}
    </div>
  )
}
