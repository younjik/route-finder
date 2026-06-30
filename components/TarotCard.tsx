"use client";

import { InterviewQuestion } from "@/lib/claude";

const CATEGORY_STYLE = {
  인성: {
    gradient: "from-purple-900 via-purple-950 to-[#0c0820]",
    badge: { bg: "rgba(107,33,168,0.7)", border: "rgba(167,139,250,0.3)", color: "#e9d5ff" },
    glow: "rgba(147,51,234,0.5)",
    accent: "#c084fc",
  },
  기술_직무: {
    gradient: "from-blue-900 via-blue-950 to-[#06091a]",
    badge: { bg: "rgba(30,64,175,0.7)", border: "rgba(147,197,253,0.3)", color: "#bfdbfe" },
    glow: "rgba(59,130,246,0.5)",
    accent: "#93c5fd",
  },
  경험: {
    gradient: "from-emerald-900 via-emerald-950 to-[#041510]",
    badge: { bg: "rgba(6,78,59,0.7)", border: "rgba(110,231,183,0.3)", color: "#a7f3d0" },
    glow: "rgba(16,185,129,0.5)",
    accent: "#6ee7b7",
  },
} as const;

const CATEGORY_LABEL: Record<string, string> = {
  인성: "인성",
  기술_직무: "기술 / 직무",
  경험: "경험",
};

interface Props {
  question: InterviewQuestion;
  isFlipped: boolean;
  isDone: boolean;
  rotation: number;
  onClick: () => void;
}

export default function TarotCard({ question, isFlipped, isDone, rotation, onClick }: Props) {
  const style = CATEGORY_STYLE[question.category];

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDone) return;
    const el = e.currentTarget as HTMLElement;
    el.style.transform = `rotate(0deg) translateY(-14px) scale(1.07)`;
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = `rotate(${rotation}deg)`;
  };

  return (
    <div
      className={`card-scene card-enter ${!isDone ? "card-glow-hover" : ""}`}
      style={{
        width: 148,
        height: 210,
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.35s cubic-bezier(0.34,1.3,0.64,1)",
        cursor: isDone ? "default" : "pointer",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isDone ? undefined : onClick}
      role={isDone ? undefined : "button"}
    >
      <div className={`card-inner w-full h-full ${isFlipped ? "is-flipped" : ""}`}>
        {/* 뒷면 */}
        <div className="card-face" style={{ borderRadius: 14, overflow: "hidden" }}>
          <CardBack isDone={isDone} />
        </div>
        {/* 앞면 */}
        <div className="card-face card-front-face" style={{ borderRadius: 14, overflow: "hidden" }}>
          <CardFront question={question} style={style} />
        </div>
      </div>
    </div>
  );
}

function CardBack({ isDone }: { isDone: boolean }) {
  return (
    <div className="w-full h-full relative" style={{ opacity: isDone ? 0.45 : 1 }}>
      <svg viewBox="0 0 148 210" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#1a0e38" />
            <stop offset="60%" stopColor="#100820" />
            <stop offset="100%" stopColor="#080510" />
          </radialGradient>
          <radialGradient id="glow-center" cx="50%" cy="50%" r="45%">
            <stop offset="0%" stopColor="#c026d3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="eye-iris" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* 배경 */}
        <rect width="148" height="210" rx="12" fill="url(#bg)" />
        <ellipse cx="74" cy="105" rx="60" ry="80" fill="url(#glow-center)" />

        {/* 테두리 이중 */}
        <rect x="5"  y="5"  width="138" height="200" rx="9"  fill="none" stroke="#92400e" strokeWidth="1.5" />
        <rect x="9"  y="9"  width="130" height="192" rx="7"  fill="none" stroke="#451a03" strokeWidth="0.7" />

        {/* 점선 원 */}
        <circle cx="74" cy="105" r="38" fill="none" stroke="#c026d3" strokeWidth="0.6" strokeDasharray="3 4" opacity="0.5" />
        <circle cx="74" cy="105" r="50" fill="none" stroke="#451a03" strokeWidth="0.4" strokeDasharray="2 6" opacity="0.4" />

        {/* 눈(Eye) */}
        <ellipse cx="74" cy="105" rx="28" ry="16" fill="#0d0720" stroke="#b45309" strokeWidth="1.5" filter="url(#glow-filter)" />
        <circle cx="74" cy="105" r="9" fill="url(#eye-iris)" />
        <circle cx="74" cy="105" r="4.5" fill="#080510" />
        {/* 하이라이트 */}
        <circle cx="77.5" cy="102" r="2" fill="rgba(255,210,120,0.65)" />
        <circle cx="71"   cy="108" r="1" fill="rgba(255,200,100,0.3)" />

        {/* 방사 라인 */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const inner = i % 2 === 0 ? 42 : 43;
          return (
            <line key={i}
              x1={74 + inner * Math.cos(a)} y1={105 + inner * Math.sin(a)}
              x2={74 + 54  * Math.cos(a)} y2={105 + 54  * Math.sin(a)}
              stroke={i % 2 === 0 ? "#92400e" : "#451a03"}
              strokeWidth={i % 2 === 0 ? "1" : "0.5"}
              opacity={i % 2 === 0 ? "0.8" : "0.4"}
            />
          );
        })}

        {/* 코너 장식 */}
        {[[16,22],[132,22],[16,196],[132,196]].map(([x,y],i) => (
          <text key={i} x={x} y={y} fill="#92400e" fontSize="14" textAnchor="middle" opacity="0.9">✦</text>
        ))}

        {/* 상단 문자 장식 */}
        <text x="74" y="48" fill="#5b21b6" fontSize="11" textAnchor="middle" opacity="0.6" letterSpacing="4">✦ ✦ ✦</text>
        <text x="74" y="172" fill="#5b21b6" fontSize="11" textAnchor="middle" opacity="0.6" letterSpacing="4">✦ ✦ ✦</text>

        {/* 카드 제목 */}
        <text x="74" y="192" fill="#92400e" fontSize="7" textAnchor="middle" opacity="0.5" letterSpacing="3">INTERVIEW TAROT</text>
      </svg>

      {/* 완료 배지 */}
      {isDone && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[14px]">
          <div
            className="check-pop w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #d97706, #92400e)",
              boxShadow: "0 0 20px rgba(217,119,6,0.6), 0 0 40px rgba(180,83,9,0.3)",
            }}
          >
            <span className="text-white font-bold text-xl">✓</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CardFront({
  question,
  style,
}: {
  question: InterviewQuestion;
  style: (typeof CATEGORY_STYLE)[keyof typeof CATEGORY_STYLE];
}) {
  return (
    <div
      className={`w-full h-full bg-gradient-to-b ${style.gradient} flex flex-col items-center justify-between py-4 px-3`}
      style={{ border: "1px solid rgba(180,83,9,0.2)" }}
    >
      <div className="text-center">
        <span style={{ color: `${style.accent}60`, fontSize: 10 }}>⟡</span>
      </div>

      <span
        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1"
        style={{
          background: style.badge.bg,
          border: `1px solid ${style.badge.border}`,
          color: style.badge.color,
        }}
      >
        {CATEGORY_LABEL[question.category]}
      </span>

      <p
        className="text-[11.5px] text-center leading-relaxed font-medium flex-1 flex items-center px-1 py-3"
        style={{ color: "rgba(253,230,138,0.88)" }}
      >
        {question.question}
      </p>

      <div style={{ color: `${style.accent}50`, fontSize: 10 }}>⟡</div>
    </div>
  );
}
