"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ARCANA } from "@/lib/arcana";
import { TarotCard } from "@/components/TarotCard";
import { AnswerDrawer } from "@/components/AnswerDrawer";
import type { GenerateResult, AnsweredCard } from "@/lib/types";

export default function CardsPage() {
  const router = useRouter();
  const [data, setData] = useState<GenerateResult | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, AnsweredCard>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // 세션에서 데이터 로드
  useEffect(() => {
    const raw = sessionStorage.getItem("interview:generate");
    if (!raw) {
      router.replace("/");
      return;
    }
    setData(JSON.parse(raw));
    const savedAns = sessionStorage.getItem("interview:answers");
    if (savedAns) {
      const arr: AnsweredCard[] = JSON.parse(savedAns);
      const map: Record<number, AnsweredCard> = {};
      const flips = new Set<number>();
      arr.forEach((a) => {
        map[a.questionId] = a;
        flips.add(a.questionId);
      });
      setAnswers(map);
      setFlipped(flips);
    }
  }, [router]);

  function persistAnswers(map: Record<number, AnsweredCard>) {
    sessionStorage.setItem(
      "interview:answers",
      JSON.stringify(Object.values(map))
    );
  }

  function handleCardClick(id: number) {
    setFlipped((prev) => new Set(prev).add(id));
    setActiveId(id);
  }

  function handleSaved(card: AnsweredCard) {
    setAnswers((prev) => {
      const next = { ...prev, [card.questionId]: card };
      persistAnswers(next);
      return next;
    });
  }

  async function saveAsImage() {
    if (!summaryRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(summaryRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0b0a14",
      });
      const link = document.createElement("a");
      link.download = `tarot-interview-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert("이미지 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <main className="loading-page">
        <div className="spinner" />
        <p>운명을 불러오는 중…</p>
        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            color: var(--mist);
          }
          .spinner {
            width: 40px; height: 40px;
            border: 3px solid var(--line);
            border-top-color: var(--gold);
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const answeredList = Object.values(answers).sort(
    (a, b) => a.questionId - b.questionId
  );
  const avgScore =
    answeredList.length > 0
      ? (
          answeredList.reduce((s, a) => s + a.evaluation.score, 0) /
          answeredList.length
        ).toFixed(1)
      : "—";

  const activeQuestion = data.questions.find((q) => q.id === activeId);

  return (
    <main className="page">
      <header className="top">
        <button className="back-btn" onClick={() => router.push("/")}>
          ← 처음으로
        </button>
        <div className="progress">
          <span className="count">{answeredCount}</span>
          <span className="slash">/ 10</span>
          <span className="lbl">답변 완료</span>
        </div>
        <button
          className="summary-btn"
          disabled={answeredCount === 0}
          onClick={() => setShowSummary(true)}
        >
          결과 보기
        </button>
      </header>

      <div className="intro-band">
        <div className="eyebrow">THE SPREAD</div>
        <h1 className="serif">열 장의 카드가 당신을 기다립니다</h1>
        <p>카드를 뒤집으면 질문이 드러납니다. 한 장씩 답해 보세요.</p>
        {data.keywords.length > 0 && (
          <div className="keywords">
            {data.keywords.map((k, i) => (
              <span className="kw" key={i}>#{k}</span>
            ))}
          </div>
        )}
      </div>

      <section className="spread">
        {ARCANA.map((arc, i) => {
          const q = data.questions.find((x) => x.id === i) ?? data.questions[i];
          const ans = answers[i];
          return (
            <TarotCard
              key={i}
              arc={arc}
              index={i}
              flipped={flipped.has(i)}
              answered={!!ans}
              advanced={q?.difficulty === "advanced"}
              score={ans?.evaluation.score}
              onClick={() => handleCardClick(q?.id ?? i)}
            />
          );
        })}
      </section>

      {/* 답변 드로어 */}
      {activeQuestion && (
        <AnswerDrawer
          question={activeQuestion}
          existing={answers[activeQuestion.id]}
          onClose={() => setActiveId(null)}
          onSaved={handleSaved}
        />
      )}

      {/* 결과 요약 모달 */}
      {showSummary && (
        <div className="summary-backdrop" onClick={() => setShowSummary(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-actions">
              <button className="save-img" onClick={saveAsImage} disabled={saving}>
                {saving ? "저장 중…" : "📷 사진으로 저장"}
              </button>
              <button className="close-modal" onClick={() => setShowSummary(false)}>
                ✕
              </button>
            </div>

            {/* 캡처 영역 */}
            <div className="capture" ref={summaryRef}>
              <div className="cap-head">
                <div className="cap-eyebrow">ARCANA · INTERVIEW READING</div>
                <h2 className="serif">오늘의 면접 리딩</h2>
                <div className="cap-stats">
                  <div className="stat">
                    <div className="stat-num serif">{avgScore}</div>
                    <div className="stat-lbl">평균 점수</div>
                  </div>
                  <div className="stat-div" />
                  <div className="stat">
                    <div className="stat-num serif">{answeredCount}</div>
                    <div className="stat-lbl">답변한 카드</div>
                  </div>
                </div>
              </div>

              <div className="cap-list">
                {answeredList.map((a) => (
                  <div className="cap-item" key={a.questionId}>
                    <div className="cap-item-top">
                      <span className="cap-arcana serif">{a.arcanaKo}</span>
                      <span className="cap-score">{a.evaluation.score}/10</span>
                    </div>
                    <p className="cap-q">{a.question}</p>
                    <p className="cap-summary">{a.evaluation.summary}</p>
                    {a.evaluation.improvements[0] && (
                      <p className="cap-tip">
                        ▸ {a.evaluation.improvements[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="cap-foot">타로 면접 · Arcana Interview</div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          position: relative;
          z-index: 1;
          max-width: 1000px;
          margin: 0 auto;
          padding: 22px 20px 80px;
        }
        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .back-btn, .summary-btn {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--parchment);
          padding: 9px 16px;
          border-radius: 9px;
          font-size: 13.5px;
          transition: border-color 0.2s, opacity 0.2s;
        }
        .back-btn:hover, .summary-btn:hover:not(:disabled) { border-color: var(--gold); }
        .summary-btn {
          color: var(--void);
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          border: none;
          font-weight: 600;
        }
        .summary-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .progress {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .progress .count {
          font-family: var(--font-display);
          font-size: 26px;
          color: var(--gold-bright);
        }
        .progress .slash { color: var(--mist); font-size: 15px; }
        .progress .lbl { font-size: 12px; color: var(--mist); margin-left: 4px; }

        .intro-band {
          text-align: center;
          margin-bottom: 38px;
        }
        .intro-band .eyebrow {
          font-size: 11px;
          letter-spacing: 0.4em;
          color: var(--gold);
          margin-bottom: 12px;
        }
        .intro-band h1 {
          font-size: clamp(26px, 5vw, 40px);
          font-weight: 600;
          margin-bottom: 10px;
        }
        .intro-band p { color: var(--mist); font-size: 14.5px; }
        .keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 18px;
        }
        .kw {
          font-size: 12px;
          color: var(--gold-bright);
          border: 1px solid var(--line);
          padding: 4px 11px;
          border-radius: 99px;
          background: rgba(201,162,75,0.06);
        }

        .spread {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }
        @media (max-width: 720px) {
          .spread { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }
        @media (max-width: 420px) {
          .spread { grid-template-columns: repeat(2, 1fr); }
        }

        /* 결과 모달 */
        .summary-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(7,6,14,0.82);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-y: auto;
          padding: 28px 16px;
          animation: fade 0.25s ease;
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .summary-modal {
          width: 100%;
          max-width: 600px;
        }
        .modal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .save-img {
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          color: var(--void);
          border: none;
          font-weight: 600;
          padding: 11px 20px;
          border-radius: 10px;
          font-size: 14px;
          box-shadow: 0 8px 24px rgba(201,162,75,0.3);
        }
        .save-img:disabled { opacity: 0.5; }
        .close-modal {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--parchment);
          width: 38px; height: 38px;
          border-radius: 9px;
        }

        .capture {
          background:
            radial-gradient(700px 300px at 50% 0%, rgba(201,162,75,0.1), transparent 60%),
            linear-gradient(180deg, #16132a, #0d0b1c);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 34px 28px 24px;
        }
        .cap-head { text-align: center; margin-bottom: 26px; }
        .cap-eyebrow {
          font-size: 10px;
          letter-spacing: 0.34em;
          color: var(--gold);
          margin-bottom: 10px;
        }
        .cap-head h2 {
          font-size: 30px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .cap-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
        }
        .stat-num { font-size: 40px; color: var(--gold-bright); line-height: 1; }
        .stat-lbl { font-size: 11px; color: var(--mist); margin-top: 4px; letter-spacing: 0.06em; }
        .stat-div { width: 1px; height: 44px; background: var(--line); }

        .cap-list { display: flex; flex-direction: column; gap: 14px; }
        .cap-item {
          border: 1px solid var(--line-soft);
          border-radius: 12px;
          padding: 16px 18px;
          background: rgba(255,255,255,0.02);
        }
        .cap-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .cap-arcana { color: var(--gold); font-size: 15px; }
        .cap-score {
          color: var(--gold-bright);
          font-weight: 700;
          font-size: 14px;
        }
        .cap-q {
          font-size: 14px;
          line-height: 1.5;
          color: var(--parchment);
          margin-bottom: 8px;
        }
        .cap-summary {
          font-size: 13px;
          line-height: 1.6;
          color: var(--mist);
        }
        .cap-tip {
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ember);
          margin-top: 6px;
        }
        .cap-foot {
          text-align: center;
          margin-top: 24px;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--gold);
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}
