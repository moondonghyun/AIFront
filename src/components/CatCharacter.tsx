import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type CatMood = "idle" | "asking" | "thinking" | "happy" | "celebrate";
export type CatPalette = "violet" | "amber" | "emerald";
export type CatPersonality = "chill" | "alert" | "smart";

interface CatCharacterProps {
  mood?: CatMood;
  size?: number;
  palette?: CatPalette;
  personality?: CatPersonality;
}

// ─── Blink hook ───────────────────────────────────────────────────

function useBlink() {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 2200 + Math.random() * 2800;
      return window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 130);
        timerId = scheduleNext();
      }, delay);
    };
    let timerId = scheduleNext();
    return () => window.clearTimeout(timerId);
  }, []);
  return blinking;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헤헤냥이 (chill) — 통통하고 늘어진 포즈, 혀 내밀고, 반쯤 감긴 눈
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChillCat({ mood, blinking }: { mood: CatMood; blinking: boolean }) {
  const isHappy = mood === "happy" || mood === "celebrate";

  return (
    <g>
      {/* === Tail — thick, lazy curl behind body === */}
      <motion.path
        d="M74,82 Q88,74 90,60 Q92,48 86,40"
        fill="none"
        stroke="#b197fc"
        strokeWidth="6"
        strokeLinecap="round"
        animate={{
          d: [
            "M74,82 Q92,74 92,60 Q93,48 88,40",
            "M74,82 Q84,74 88,60 Q90,48 84,42",
            "M74,82 Q92,74 92,60 Q93,48 88,40",
          ],
        }}
        transition={{ duration: isHappy ? 0.7 : 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* === Body — extra chubby, low-sitting === */}
      <ellipse cx={50} cy={62} rx={32} ry={26} fill="#d0bfff" />
      {/* Belly — big round lighter area */}
      <ellipse cx={50} cy={66} rx={22} ry={18} fill="#e5dbff" />
      {/* Belly line */}
      <path d="M44,74 Q50,78 56,74" fill="none" stroke="#c4b0f0" strokeWidth="1" strokeLinecap="round" opacity={0.4} />

      {/* === Head — round, slightly tilted === */}
      <g transform="rotate(5, 50, 42)">
        <ellipse cx={50} cy={42} rx={24} ry={20} fill="#d0bfff" />

        {/* Inner face lighter area */}
        <ellipse cx={50} cy={44} rx={17} ry={14} fill="#e5dbff" />

        {/* === Ears — floppy, tilted outward === */}
        {/* Left ear */}
        <path d="M28,34 Q24,14 38,28" fill="#d0bfff" stroke="#c4b0f0" strokeWidth="1" />
        <path d="M30,31 Q27,19 36,29" fill="#f0e4ff" />
        {/* Right ear */}
        <path d="M62,28 Q76,14 72,34" fill="#d0bfff" stroke="#c4b0f0" strokeWidth="1" />
        <path d="M64,29 Q73,19 70,31" fill="#f0e4ff" />

        {/* === Eyes — half-lidded, droopy === */}
        {isHappy ? (
          <g>
            <path d="M38,41 Q42,37 46,41" fill="none" stroke="#2d2042" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M54,41 Q58,37 62,41" fill="none" stroke="#2d2042" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : blinking ? (
          <g>
            <line x1={37} y1={41} x2={47} y2={41} stroke="#2d2042" strokeWidth="2.2" strokeLinecap="round" />
            <line x1={53} y1={41} x2={63} y2={41} stroke="#2d2042" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* Left eye */}
            <ellipse cx={42} cy={41} rx={5} ry={3.5} fill="#2d2042" />
            <ellipse cx={43} cy={40} rx={1.8} ry={1.3} fill="white" opacity={0.9} />
            {/* Heavy eyelid */}
            <path d="M36,39 Q42,36 48,39" fill="#d0bfff" stroke="none" />
            <path d="M36,39 Q42,37.5 48,39" fill="none" stroke="#b197fc" strokeWidth="0.8" />

            {/* Right eye */}
            <ellipse cx={58} cy={41} rx={5} ry={3.5} fill="#2d2042" />
            <ellipse cx={59} cy={40} rx={1.8} ry={1.3} fill="white" opacity={0.9} />
            <path d="M52,39 Q58,36 64,39" fill="#d0bfff" stroke="none" />
            <path d="M52,39 Q58,37.5 64,39" fill="none" stroke="#b197fc" strokeWidth="0.8" />
          </g>
        )}

        {/* === Nose — round pink === */}
        <ellipse cx={50} cy={47} rx={2.5} ry={2} fill="#f0a0c0" />

        {/* === Mouth — goofy grin + tongue === */}
        {isHappy ? (
          <g>
            <path d="M43,50 Q50,58 57,50" fill="none" stroke="#2d2042" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx={50} cy={55} rx={4.5} ry={3.5} fill="#fca5a5" />
            <ellipse cx={50} cy={54} rx={3.5} ry={2} fill="#fca5a5" opacity={0.6} />
          </g>
        ) : (
          <g>
            <path d="M44,49 Q50,54 56,49" fill="none" stroke="#2d2042" strokeWidth="1.5" strokeLinecap="round" />
            {/* Tongue peek */}
            <ellipse cx={50} cy={52.5} rx={3} ry={2.2} fill="#fca5a5" />
          </g>
        )}

        {/* === Whiskers — droopy === */}
        <g opacity={0.25}>
          <path d="M20,44 Q30,46 35,45" fill="none" stroke="#2d2042" strokeWidth="0.8" />
          <path d="M18,48 Q28,49 35,48" fill="none" stroke="#2d2042" strokeWidth="0.8" />
          <path d="M65,45 Q70,46 80,44" fill="none" stroke="#2d2042" strokeWidth="0.8" />
          <path d="M65,48 Q72,49 82,48" fill="none" stroke="#2d2042" strokeWidth="0.8" />
        </g>

        {/* === Blush === */}
        <ellipse cx={34} cy={48} rx={4} ry={2.5} fill="#f0a0c0" opacity={isHappy ? 0.45 : 0.2} />
        <ellipse cx={66} cy={48} rx={4} ry={2.5} fill="#f0a0c0" opacity={isHappy ? 0.45 : 0.2} />
      </g>

      {/* === Front paws — visible, splayed out lazily === */}
      <ellipse cx={36} cy={84} rx={7} ry={4} fill="#d0bfff" />
      <ellipse cx={64} cy={84} rx={7} ry={4} fill="#d0bfff" />
      {/* Paw beans */}
      <circle cx={34} cy={83.5} r={1.2} fill="#c4b0f0" opacity={0.5} />
      <circle cx={37} cy={83} r={1} fill="#c4b0f0" opacity={0.5} />
      <circle cx={62} cy={83} r={1} fill="#c4b0f0" opacity={0.5} />
      <circle cx={65} cy={83.5} r={1.2} fill="#c4b0f0" opacity={0.5} />

      {/* === Sweat drop (chill vibes) === */}
      {!isHappy && (
        <motion.g
          animate={{ opacity: [0, 0.5, 0], y: [0, 2, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 5 }}
        >
          <path d="M76,32 Q77,28 78,32 Q77,34 76,32" fill="#93c5fd" opacity={0.5} />
        </motion.g>
      )}
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 또렷냥이 (alert) — 균형잡힌 자세, 큰 눈, 활기찬 꼬리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AlertCat({ mood, blinking }: { mood: CatMood; blinking: boolean }) {
  const isHappy = mood === "happy" || mood === "celebrate";
  const isThinking = mood === "thinking";

  return (
    <g>
      {/* === Tail — upright, energetic === */}
      <motion.path
        d="M72,78 Q84,68 82,54 Q80,42 76,36"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="5"
        strokeLinecap="round"
        animate={{
          d: [
            "M72,78 Q88,68 86,54 Q84,42 80,34",
            "M72,78 Q78,68 78,54 Q78,42 74,36",
            "M72,78 Q88,68 86,54 Q84,42 80,34",
          ],
        }}
        transition={{ duration: isHappy ? 0.5 : 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Tail stripes */}
      <motion.g
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <path d="M78,62 Q82,60 84,58" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity={0.3} />
        <path d="M76,68 Q80,66 82,64" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity={0.3} />
      </motion.g>

      {/* === Body — normal proportion, sitting upright === */}
      <ellipse cx={50} cy={64} rx={28} ry={24} fill="#fcd34d" />
      {/* Chest lighter area */}
      <ellipse cx={50} cy={68} rx={18} ry={16} fill="#fef3c7" />

      {/* === Head — round, centered === */}
      <ellipse cx={50} cy={40} rx={22} ry={19} fill="#fcd34d" />
      <ellipse cx={50} cy={42} rx={15} ry={13} fill="#fef3c7" />

      {/* === Ears — tall, alert, triangular === */}
      <path d="M30,32 L36,6 L44,28" fill="#fcd34d" stroke="#f59e0b" strokeWidth="0.8" />
      <path d="M33,29 L36,11 L41,27" fill="#fef3c7" />
      <path d="M56,28 L64,6 L70,32" fill="#fcd34d" stroke="#f59e0b" strokeWidth="0.8" />
      <path d="M59,27 L64,11 L67,29" fill="#fef3c7" />

      {/* Ear tufts */}
      <path d="M36,10 L34,6 L38,8" fill="#f59e0b" opacity={0.4} />
      <path d="M64,10 L62,6 L66,8" fill="#f59e0b" opacity={0.4} />

      {/* === Eyes — big, round, sparkling === */}
      {isHappy ? (
        <g>
          <path d="M37,39 Q42,33 47,39" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M53,39 Q58,33 63,39" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ) : blinking ? (
        <g>
          <line x1={36} y1={38} x2={48} y2={38} stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
          <line x1={52} y1={38} x2={64} y2={38} stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {/* Left eye — big sparkly */}
          <circle cx={42} cy={38} r={6} fill="#78350f" />
          <circle cx={44} cy={36} r={2.5} fill="white" />
          <circle cx={40} cy={40} r={1.2} fill="white" opacity={0.5} />
          {isThinking && (
            <motion.circle cx={44} cy={36} r={2.5} fill="white"
              animate={{ cx: [43, 45, 43], cy: [35, 34, 35] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          {/* Right eye */}
          <circle cx={58} cy={38} r={6} fill="#78350f" />
          <circle cx={60} cy={36} r={2.5} fill="white" />
          <circle cx={56} cy={40} r={1.2} fill="white" opacity={0.5} />
          {isThinking && (
            <motion.circle cx={60} cy={36} r={2.5} fill="white"
              animate={{ cx: [59, 61, 59], cy: [35, 34, 35] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </g>
      )}

      {/* === Nose === */}
      <path d="M48,44 L50,46 L52,44" fill="#f97316" stroke="none" />

      {/* === Mouth === */}
      {isHappy ? (
        <path d="M44,48 Q50,55 56,48" fill="none" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
      ) : isThinking ? (
        <ellipse cx={51} cy={49} rx={2.5} ry={2} fill="#78350f" opacity={0.5} />
      ) : (
        <g>
          <path d="M48,47 L50,49 L52,47" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}

      {/* === Whiskers — neat, straight === */}
      <g opacity={0.3}>
        <line x1={18} y1={42} x2={35} y2={44} stroke="#78350f" strokeWidth="0.8" />
        <line x1={18} y1={46} x2={35} y2={47} stroke="#78350f" strokeWidth="0.8" />
        <line x1={17} y1={50} x2={35} y2={49} stroke="#78350f" strokeWidth="0.8" />
        <line x1={65} y1={44} x2={82} y2={42} stroke="#78350f" strokeWidth="0.8" />
        <line x1={65} y1={47} x2={82} y2={46} stroke="#78350f" strokeWidth="0.8" />
        <line x1={65} y1={49} x2={83} y2={50} stroke="#78350f" strokeWidth="0.8" />
      </g>

      {/* === Blush === */}
      <ellipse cx={33} cy={46} rx={4} ry={2.5} fill="#fdba74" opacity={isHappy ? 0.5 : 0.2} />
      <ellipse cx={67} cy={46} rx={4} ry={2.5} fill="#fdba74" opacity={isHappy ? 0.5 : 0.2} />

      {/* === Front paws — neat === */}
      <ellipse cx={38} cy={84} rx={6} ry={3.5} fill="#fcd34d" />
      <ellipse cx={62} cy={84} rx={6} ry={3.5} fill="#fcd34d" />
      <circle cx={36} cy={83.5} r={1} fill="#f59e0b" opacity={0.35} />
      <circle cx={39} cy={83} r={0.8} fill="#f59e0b" opacity={0.35} />
      <circle cx={60} cy={83} r={0.8} fill="#f59e0b" opacity={0.35} />
      <circle cx={63} cy={83.5} r={1} fill="#f59e0b" opacity={0.35} />

      {/* === Lightning icon above === */}
      <motion.g
        animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <path d="M50,0 L47,9 L51,8 L48,15 L54,6 L50,7 Z" fill="#f59e0b" opacity={0.6} />
      </motion.g>

      {/* === Tabby stripes on forehead === */}
      <path d="M42,30 Q50,27 58,30" fill="none" stroke="#d97706" strokeWidth="1" strokeLinecap="round" opacity={0.25} />
      <path d="M44,33 Q50,31 56,33" fill="none" stroke="#d97706" strokeWidth="0.8" strokeLinecap="round" opacity={0.2} />
    </g>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 똑똑냥이 (smart) — 날렵한 체형, 안경, 집중된 눈매
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SmartCat({ mood, blinking }: { mood: CatMood; blinking: boolean }) {
  const isHappy = mood === "happy" || mood === "celebrate";
  const isThinking = mood === "thinking";

  return (
    <g>
      {/* === Tail — elegant, long S-curve === */}
      <motion.path
        d="M72,78 Q86,70 84,56 Q82,44 78,38 Q74,32 76,26"
        fill="none"
        stroke="#6ee7b7"
        strokeWidth="4.5"
        strokeLinecap="round"
        animate={{
          d: [
            "M72,78 Q88,70 86,56 Q84,44 80,38 Q76,32 78,26",
            "M72,78 Q82,70 82,56 Q82,44 78,38 Q74,34 74,28",
            "M72,78 Q88,70 86,56 Q84,44 80,38 Q76,32 78,26",
          ],
        }}
        transition={{ duration: isHappy ? 0.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Tail tip — darker */}
      <motion.circle
        cx={77}
        cy={26}
        r={3}
        fill="#34d399"
        animate={{ cx: [78, 74, 78], cy: [26, 28, 26] }}
        transition={{ duration: isHappy ? 0.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* === Body — slimmer, more elegant === */}
      <ellipse cx={50} cy={64} rx={26} ry={22} fill="#86efac" />
      <ellipse cx={50} cy={67} rx={17} ry={14} fill="#bbf7d0" />

      {/* === Head — slightly oval, refined shape === */}
      <ellipse cx={50} cy={40} rx={21} ry={18} fill="#86efac" />
      <ellipse cx={50} cy={42} rx={14} ry={12} fill="#bbf7d0" />

      {/* === Ears — tall, pointed, elegant === */}
      <path d="M31,30 L37,2 L45,26" fill="#86efac" stroke="#34d399" strokeWidth="0.8" />
      <path d="M34,27 L37,8 L42,25" fill="#bbf7d0" />
      <path d="M55,26 L63,2 L69,30" fill="#86efac" stroke="#34d399" strokeWidth="0.8" />
      <path d="M58,25 L63,8 L66,27" fill="#bbf7d0" />

      {/* === Eyes — sharp, focused === */}
      {isHappy ? (
        <g>
          <path d="M36,38 Q41,32 46,38" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M54,38 Q59,32 64,38" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ) : blinking ? (
        <g>
          <line x1={35} y1={38} x2={47} y2={37} stroke="#064e3b" strokeWidth="2" strokeLinecap="round" />
          <line x1={53} y1={37} x2={65} y2={38} stroke="#064e3b" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {/* Sharp brow lines */}
          <path d="M34,33 L40,32" stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" opacity={0.4} />
          <path d="M60,32 L66,33" stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" opacity={0.4} />

          {/* Left eye — almond shape */}
          <ellipse cx={41} cy={38} rx={5.5} ry={4.5} fill="#064e3b" />
          <ellipse cx={42.5} cy={36.5} rx={2} ry={1.5} fill="white" />
          <circle cx={39.5} cy={39.5} r={0.8} fill="white" opacity={0.4} />

          {/* Right eye */}
          <ellipse cx={59} cy={38} rx={5.5} ry={4.5} fill="#064e3b" />
          <ellipse cx={60.5} cy={36.5} rx={2} ry={1.5} fill="white" />
          <circle cx={57.5} cy={39.5} r={0.8} fill="white" opacity={0.4} />

          {isThinking && (
            <g>
              <motion.ellipse cx={42.5} cy={36.5} rx={2} ry={1.5} fill="white"
                animate={{ cx: [42, 43.5, 42] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <motion.ellipse cx={60.5} cy={36.5} rx={2} ry={1.5} fill="white"
                animate={{ cx: [60, 61.5, 60] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </g>
          )}
        </g>
      )}

      {/* === Glasses — round intellectual frames === */}
      {!isHappy && (
        <g>
          <circle cx={41} cy={38} r={8.5} fill="none" stroke="#064e3b" strokeWidth="1.6" />
          <circle cx={59} cy={38} r={8.5} fill="none" stroke="#064e3b" strokeWidth="1.6" />
          <path d="M49.5,38 Q50,36 50.5,38" fill="none" stroke="#064e3b" strokeWidth="1.4" />
          <line x1={32.5} y1={37} x2={26} y2={35} stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={67.5} y1={37} x2={74} y2={35} stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" />
          {/* Lens glare */}
          <path d="M36,34 Q37,33 38,34" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity={0.45} />
          <path d="M54,34 Q55,33 56,34" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity={0.45} />
        </g>
      )}

      {/* === Nose — small, elegant triangle === */}
      <path d="M48.5,44 L50,46 L51.5,44" fill="#f0a0c0" />

      {/* === Mouth — composed === */}
      {isHappy ? (
        <path d="M45,48 Q50,54 55,48" fill="none" stroke="#064e3b" strokeWidth="1.6" strokeLinecap="round" />
      ) : isThinking ? (
        <path d="M47,48 Q50,50 54,47" fill="none" stroke="#064e3b" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path d="M47,48 Q50,51 53,48" fill="none" stroke="#064e3b" strokeWidth="1.3" strokeLinecap="round" />
      )}

      {/* === Whiskers — fine, elegant === */}
      <g opacity={0.2}>
        <line x1={18} y1={42} x2={33} y2={43} stroke="#064e3b" strokeWidth="0.7" />
        <line x1={16} y1={46} x2={33} y2={46} stroke="#064e3b" strokeWidth="0.7" />
        <line x1={67} y1={43} x2={82} y2={42} stroke="#064e3b" strokeWidth="0.7" />
        <line x1={67} y1={46} x2={84} y2={46} stroke="#064e3b" strokeWidth="0.7" />
      </g>

      {/* === Blush === */}
      <ellipse cx={33} cy={46} rx={3.5} ry={2} fill="#fca5a5" opacity={isHappy ? 0.45 : 0.15} />
      <ellipse cx={67} cy={46} rx={3.5} ry={2} fill="#fca5a5" opacity={isHappy ? 0.45 : 0.15} />

      {/* === Front paws — neat, delicate === */}
      <ellipse cx={38} cy={84} rx={5.5} ry={3} fill="#86efac" />
      <ellipse cx={62} cy={84} rx={5.5} ry={3} fill="#86efac" />
      <circle cx={36.5} cy={83.5} r={0.9} fill="#34d399" opacity={0.35} />
      <circle cx={39} cy={83} r={0.7} fill="#34d399" opacity={0.35} />
      <circle cx={60.5} cy={83} r={0.7} fill="#34d399" opacity={0.35} />
      <circle cx={63} cy={83.5} r={0.9} fill="#34d399" opacity={0.35} />

      {/* === Thinking bubble (when thinking) === */}
      {isThinking && (
        <motion.g
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx={78} cy={22} r={2} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="0.5" />
          <circle cx={82} cy={16} r={3} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="0.5" />
          <circle cx={84} cy={8} r={4.5} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="0.5" />
          <text x={82} y={10} textAnchor="middle" fontSize="5" fill="#064e3b" opacity={0.6}>?</text>
        </motion.g>
      )}
    </g>
  );
}

// ─── Celebrate sparkles ───────────────────────────────────────────

function CelebrateSparkles() {
  return (
    <g>
      {[
        { x: 16, y: 12, delay: 0 },
        { x: 82, y: 8, delay: 0.3 },
        { x: 88, y: 32, delay: 0.6 },
        { x: 10, y: 36, delay: 0.9 },
      ].map((s, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 20, 0] }}
          transition={{ delay: s.delay, duration: 1, repeat: Infinity, repeatDelay: 0.6 }}
        >
          <line x1={s.x} y1={s.y - 3.5} x2={s.x} y2={s.y + 3.5} stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={s.x - 3.5} y1={s.y} x2={s.x + 3.5} y2={s.y} stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={s.x - 2.5} y1={s.y - 2.5} x2={s.x + 2.5} y2={s.y + 2.5} stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
          <line x1={s.x + 2.5} y1={s.y - 2.5} x2={s.x - 2.5} y2={s.y + 2.5} stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
        </motion.g>
      ))}
    </g>
  );
}

// ─── Body animation ───────────────────────────────────────────────

function getBodyAnimation(mood: CatMood, personality: CatPersonality) {
  const isHappy = mood === "happy" || mood === "celebrate";
  if (personality === "chill") {
    return isHappy
      ? { y: [0, -4, 0], rotate: [3, -2, 3] }
      : { y: [0, -1.5, 0], rotate: [2, 3.5, 2] };
  }
  if (personality === "smart") {
    if (mood === "thinking") return { y: [0, -1, 0], rotate: [0, -1.5, 0] };
    return isHappy
      ? { y: [0, -5, 0], rotate: [0, -2, 2, 0] }
      : { y: [0, -1.5, 0] };
  }
  // alert
  if (mood === "asking") return { y: [0, -2.5, 0], rotate: [0, 3, 0] };
  return isHappy
    ? { y: [0, -6, 0], rotate: [0, -3, 3, 0] }
    : { y: [0, -2, 0] };
}

function getBodyTransition(mood: CatMood, personality: CatPersonality) {
  const isHappy = mood === "happy" || mood === "celebrate";
  const dur = personality === "chill" ? (isHappy ? 0.8 : 3) : personality === "smart" ? (isHappy ? 0.6 : 2.8) : (isHappy ? 0.5 : 2);
  return { duration: dur, repeat: Infinity as const, ease: "easeInOut" as const };
}

// ─── Main component ───────────────────────────────────────────────

const CatCharacter = ({
  mood = "idle",
  size = 64,
  personality = "alert",
}: CatCharacterProps) => {
  const blinking = useBlink();
  const bodyAnimation = getBodyAnimation(mood, personality);
  const bodyTransition = getBodyTransition(mood, personality);

  return (
    <motion.div style={{ width: size, height: size }} className="relative select-none">
      <motion.svg
        viewBox="0 0 100 92"
        width={size}
        height={size}
        animate={bodyAnimation}
        transition={bodyTransition}
      >
        {personality === "chill" && <ChillCat mood={mood} blinking={blinking} />}
        {personality === "alert" && <AlertCat mood={mood} blinking={blinking} />}
        {personality === "smart" && <SmartCat mood={mood} blinking={blinking} />}

        <AnimatePresence>
          {mood === "celebrate" && <CelebrateSparkles />}
        </AnimatePresence>
      </motion.svg>
    </motion.div>
  );
};

export default CatCharacter;
