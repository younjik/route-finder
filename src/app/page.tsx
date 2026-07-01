"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GenerateResult } from "@/lib/types";

function FileSlot({
  label,
  accept,
  file,
  onPick,
}: {
  label: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      className={`slot ${file ? "filled" : ""} ${drag ? "drag" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.[0]) onPick(e.dataTransfer.files[0]);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="slot-glyph">{file ? "✓" : "+"}</div>
      <div className="slot-label">{label}</div>
      <div className="slot-sub">
        {file ? file.name : "클릭 또는 드래그하여 업로드"}
      </div>

      <style jsx>{`
        .slot {
          position: relative;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 34px 24px;
          text-align: center;
          background: linear-gradient(
            180deg,
            rgba(31, 27, 58, 0.6),
            rgba(22, 19, 42, 0.35)
          );
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
          backdrop-filter: blur(2px);
        }
        .slot:hover,
        .slot.drag {
          transform: translateY(-3px);
          border-color: var(--gold);
          box-shadow:
            0 14px 40px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(201, 162, 75, 0.15) inset;
        }
        .slot.filled {
          border-color: var(--gold);
          background: linear-gradient(
            180deg,
            rgba(201, 162, 75, 0.12),
            rgba(22, 19, 42, 0.4)
          );
        }
        .slot-glyph {
          font-family: var(--font-display);
          font-size: 40px;
          color: var(--gold-bright);
          line-height: 1;
          margin-bottom: 14px;
        }
        .slot-label {
          font-family: "Renaissance Secret", serif;
          font-size: 22px;
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }
        .slot-sub {
          font-size: 13px;
          color: var(--mist);
          word-break: break-all;
          padding: 0 8px;
        }
      `}</style>
    </div>
  );
}

const DEMO_DATA = {
  keywords: ["데모", "면접준비", "타로"],
  questions: [
    {
      id: 0,
      arcana: "The Magician",
      arcanaKo: "마법사",
      category: "직무역량",
      difficulty: "normal",
      question:
        "본인이 가진 핵심 역량 중 이 직무에 가장 잘 맞는 것은 무엇인가요?",
    },
    {
      id: 1,
      arcana: "The High Priestess",
      arcanaKo: "여사제",
      category: "문제해결",
      difficulty: "normal",
      question: "업무 중 예상치 못한 문제가 발생했을 때 어떻게 대처했나요?",
    },
    {
      id: 2,
      arcana: "The Empress",
      arcanaKo: "여황제",
      category: "협업",
      difficulty: "normal",
      question: "팀원과 의견이 충돌했던 경험과 어떻게 해결했는지 말해주세요.",
    },
    {
      id: 3,
      arcana: "The Emperor",
      arcanaKo: "황제",
      category: "리더십",
      difficulty: "advanced",
      question:
        "프로젝트를 이끌면서 가장 어려웠던 순간과 그것을 극복한 방법은?",
    },
    {
      id: 4,
      arcana: "The Hierophant",
      arcanaKo: "교황",
      category: "가치관",
      difficulty: "normal",
      question: "회사를 선택할 때 가장 중요하게 생각하는 기준은 무엇인가요?",
    },
    {
      id: 5,
      arcana: "The Lovers",
      arcanaKo: "연인",
      category: "의사결정",
      difficulty: "normal",
      question: "여러 선택지 앞에서 결정을 내리는 본인만의 방법이 있나요?",
    },
    {
      id: 6,
      arcana: "The Chariot",
      arcanaKo: "전차",
      category: "목표달성",
      difficulty: "advanced",
      question:
        "설정한 목표를 달성하기 위해 특별히 노력했던 경험을 들려주세요.",
    },
    {
      id: 7,
      arcana: "Strength",
      arcanaKo: "힘",
      category: "위기극복",
      difficulty: "normal",
      question: "극심한 스트레스나 압박을 받았을 때 어떻게 대처하나요?",
    },
    {
      id: 8,
      arcana: "The Hermit",
      arcanaKo: "은둔자",
      category: "자기계발",
      difficulty: "normal",
      question:
        "최근 스스로 새롭게 배우거나 성장한 경험이 있다면 소개해주세요.",
    },
    {
      id: 9,
      arcana: "Wheel of Fortune",
      arcanaKo: "운명의 수레바퀴",
      category: "적응력",
      difficulty: "advanced",
      question:
        "빠르게 변화하는 환경에서 본인이 어떻게 적응해 왔는지 말해주세요.",
    },
  ],
} as const;

export default function UploadPage() {
  const router = useRouter();
  const [resume, setResume] = useState<File | null>(null);
  const [job, setJob] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModeModal, setShowModeModal] = useState(false);

  const ready = (resume || job) && !loading;

  // 모달 열려 있을 때 ESC로 닫기 (생성 취소)
  useEffect(() => {
    if (!showModeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModeModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModeModal]);

  function handleDemo() {
    sessionStorage.setItem("interview:generate", JSON.stringify(DEMO_DATA));
    sessionStorage.removeItem("interview:answers");
    router.push("/cards");
  }

  // 버튼 클릭 → 바로 생성하지 않고 난이도 선택 모달을 띄운다
  function openModeModal() {
    if (!resume && !job) return;
    setShowModeModal(true);
  }

  // 카드 선택 → 모드 저장 후 모달 닫고 곧바로 생성
  function chooseMode(mode: "easy" | "hard") {
    localStorage.setItem("gradeMode", mode);
    setShowModeModal(false);
    handleGenerate();
  }

  async function handleGenerate() {
    if (!resume && !job) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      if (resume) fd.append("resume", resume);
      if (job) fd.append("job", job);
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "질문 생성 실패");

      const result = data as GenerateResult;
      sessionStorage.setItem("interview:generate", JSON.stringify(result));
      sessionStorage.removeItem("interview:answers");
      router.push("/cards");
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="deck">
            <div className="tarot-card c1" />
            <div className="tarot-card c2" />
            <div className="tarot-card c3" />
            <div className="tarot-card c4" />
            <div className="tarot-card c5" />
          </div>
          <div className="load-title serif">카드를 섞는 중…</div>
          <div className="load-sub">질문을 뽑아내고 있습니다</div>
        </div>
      )}

      {showModeModal && (
        <div
          className="mode-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="면접 난이도 선택"
          onClick={() => setShowModeModal(false)}
        >
          <div className="mode-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="mode-title serif">면접 난이도를 선택하세요</h2>
            <div className="mode-cards">
              <button
                className="mode-card encourage"
                onClick={() => chooseMode("easy")}
              >
                <div className="mode-glyph">✧</div>
                <div className="mode-name serif">격려 모드</div>
                <div className="mode-desc">
                  강점을 먼저 짚고 후하게 평가합니다
                </div>
              </button>
              <button
                className="mode-card whip"
                onClick={() => chooseMode("hard")}
              >
                <div className="mode-glyph">⚔</div>
                <div className="mode-name serif">채찍 모드</div>
                <div className="mode-desc">
                  실전 압박 면접처럼 냉정하게 평가합니다
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="hero">
        <div className="eyebrow">ARCANA · INTERVIEW</div>
        <h1
          className="serif title"
          style={{ fontFamily: '"Renaissance Secret", serif' }}
        >
          당신이 고른 카드로
          <br />
          면접이 시작됩니다
        </h1>
        <p className="lede">
          자소서나 채용공고, 하나만 있어도 질문 열 장을 뽑아냅니다.
          <br />둘 다 펼쳐 두면 더 날카로운 질문이 나옵니다. <br />
          카드를 뒤집고, 목소리로 답하고, 평가를 받으세요.
        </p>
      </header>

      <section className="slots">
        <FileSlot
          label="자기소개서"
          accept=".pdf,.docx"
          file={resume}
          onPick={setResume}
        />
        <FileSlot
          label="채용공고"
          accept=".pdf,.png,.jpg,.jpeg"
          file={job}
          onPick={setJob}
        />
      </section>

      {error && <div className="error">⚠ {error}</div>}

      <button className="cta" disabled={!ready} onClick={openModeModal}>
        {loading ? (
          <span className="loading-text">카드를 펼치는 중…</span>
        ) : (
          "질문 만들기"
        )}
      </button>

      <div className="hint">PDF · DOCX 자소서 / PDF · 이미지 채용공고 지원</div>

      {/* TODO: 배포 전 제거 */}
      <div className="demo-wrap">
        <button className="demo-btn" onClick={handleDemo}>
          ⚡ 데모 — PDF 없이 바로 시작
        </button>
      </div>

      <style jsx>{`
        .wrap {
          position: relative;
          z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          padding: 72px 24px 96px;
        }
        .hero {
          text-align: center;
          margin-bottom: 52px;
        }
        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.42em;
          color: var(--gold);
          margin-bottom: 20px;
        }
        .title {
          font-size: clamp(36px, 7vw, 60px);
          font-weight: 600;
          line-height: 1.12;
          letter-spacing: 0.01em;
        }
        .lede {
          margin: 22px auto 0;
          max-width: 480px;
          color: var(--mist);
          font-size: 15.5px;
          line-height: 1.7;
        }
        .slots {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 28px;
        }
        @media (max-width: 560px) {
          .slots {
            grid-template-columns: 1fr;
          }
        }
        .error {
          color: var(--ember);
          background: rgba(194, 84, 58, 0.1);
          border: 1px solid rgba(194, 84, 58, 0.35);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 18px;
          font-size: 14px;
        }
        .cta {
          width: 100%;
          padding: 18px;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--void);
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          border: none;
          border-radius: 12px;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s;
          box-shadow: 0 10px 34px rgba(201, 162, 75, 0.28);
        }
        .cta:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 44px rgba(201, 162, 75, 0.4);
        }
        .cta:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .loading-text {
          display: inline-block;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .hint {
          text-align: center;
          margin-top: 18px;
          font-size: 12.5px;
          color: var(--mist);
          opacity: 0.7;
        }
        .demo-wrap {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px dashed rgba(201, 162, 75, 0.2);
        }
        .demo-btn {
          background: transparent;
          border: 1px dashed rgba(201, 162, 75, 0.45);
          color: var(--gold);
          font-size: 13px;
          padding: 10px 22px;
          border-radius: 9px;
          opacity: 0.7;
          transition:
            opacity 0.2s,
            border-color 0.2s;
        }
        .demo-btn:hover {
          opacity: 1;
          border-color: var(--gold);
        }

        /* ── 로딩 오버레이 ── */
        .loading-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 34px;
          background: radial-gradient(
            circle at 50% 42%,
            rgba(60, 29, 110, 0.55),
            rgba(11, 4, 28, 0.92) 70%
          );
          backdrop-filter: blur(6px);
          animation: overlay-in 0.4s ease both;
        }
        @keyframes overlay-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .deck {
          position: relative;
          width: 120px;
          height: 180px;
          perspective: 900px;
        }
        .tarot-card {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          border: 1px solid var(--line);
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(243, 182, 224, 0.28),
              transparent 60%
            ),
            linear-gradient(160deg, var(--velvet-2), var(--ink));
          box-shadow:
            0 12px 34px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(238, 160, 214, 0.14) inset;
          transform-style: preserve-3d;
          transform-origin: center;
          animation: shuffle 2.4s ease-in-out infinite;
        }
        .tarot-card::after {
          content: "✦";
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          color: var(--gold-bright);
          opacity: 0.85;
        }
        .c1 {
          animation-delay: 0s;
        }
        .c2 {
          animation-delay: 0.32s;
        }
        .c3 {
          animation-delay: 0.64s;
        }
        .c4 {
          animation-delay: 0.96s;
        }
        .c5 {
          animation-delay: 1.28s;
        }
        @keyframes shuffle {
          0% {
            transform: translate(0, 0) rotate(0deg) rotateY(0deg);
            z-index: 1;
          }
          25% {
            transform: translate(-58px, -26px) rotate(-11deg) rotateY(180deg);
            z-index: 5;
          }
          50% {
            transform: translate(0, -8px) rotate(0deg) rotateY(360deg);
            z-index: 3;
          }
          75% {
            transform: translate(58px, -26px) rotate(11deg) rotateY(180deg);
            z-index: 5;
          }
          100% {
            transform: translate(0, 0) rotate(0deg) rotateY(0deg);
            z-index: 1;
          }
        }
        .load-title {
          font-size: 26px;
          letter-spacing: 0.04em;
          color: var(--parchment);
          animation: pulse 1.8s ease-in-out infinite;
        }
        .load-sub {
          margin-top: -22px;
          font-size: 13.5px;
          letter-spacing: 0.06em;
          color: var(--mist);
          opacity: 0.8;
        }

        /* ── 난이도 선택 모달 ── */
        .mode-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(
            circle at 50% 42%,
            rgba(60, 29, 110, 0.5),
            rgba(11, 4, 28, 0.9) 70%
          );
          backdrop-filter: blur(6px);
          animation: overlay-in 0.3s ease both;
        }
        .mode-box {
          width: 100%;
          max-width: 560px;
          text-align: center;
          animation: mode-rise 0.35s ease both;
        }
        @keyframes mode-rise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mode-title {
          font-size: 28px;
          letter-spacing: 0.03em;
          color: var(--parchment);
          margin-bottom: 26px;
        }
        .mode-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 520px) {
          .mode-cards {
            grid-template-columns: 1fr;
          }
        }
        .mode-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 30px 22px;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: linear-gradient(160deg, var(--velvet-2), var(--ink));
          color: var(--parchment);
          text-align: center;
          transition:
            transform 0.22s ease,
            border-color 0.22s ease,
            box-shadow 0.22s ease;
        }
        .mode-card:hover {
          transform: translateY(-4px);
          border-color: var(--gold);
          box-shadow:
            0 16px 44px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(238, 160, 214, 0.2) inset;
        }
        .mode-glyph {
          font-size: 40px;
          line-height: 1;
          color: var(--gold-bright);
        }
        .mode-card.whip .mode-glyph {
          color: var(--ember);
        }
        .mode-name {
          font-size: 22px;
          letter-spacing: 0.02em;
        }
        .mode-desc {
          font-size: 13px;
          line-height: 1.6;
          color: var(--mist);
          padding: 0 4px;
        }
      `}</style>
    </main>
  );
}
