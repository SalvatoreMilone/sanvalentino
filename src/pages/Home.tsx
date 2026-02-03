import { useState, useCallback } from "react"
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

export default function Home() {
  const [saidYes, setSaidYes] = useState(false)
  const [floatingNos, setFloatingNos] = useState<NoButton[]>([])

  const handleNoFromBox = useCallback(() => {
    setFloatingNos([
      { id: nextId(), ...randomInView(), scale: 1, isDecoy: false, shrinkCount: 0 },
    ])
  }, [])

  const handleRealNoClick = useCallback((id: string) => {
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
    <div className="min-h-svh flex flex-col items-center justify-center bg-background text-foreground relative">
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

      {floatingNos.map((btn) => (
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

      {!saidYes && (
        <>
          <div className="absolute inset-0 z-0 h-full w-full">
            <PixelBlast
              variant="square"
              pixelSize={4}
              color="#ff78f4"
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
              color="#ff78e4"
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
