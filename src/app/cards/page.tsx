"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ARCANA } from "@/lib/arcana";
import { TarotCard } from "@/components/TarotCard";
import { AnswerDrawer } from "@/components/AnswerDrawer";
import type { GenerateResult, AnsweredCard } from "@/lib/types";

// 부채꼴 아치의 반지름 — CSS의 --R 값과 반드시 일치해야 함
const ARC_RADIUS = 420;
// 휠/드래그로 회전시킬 수 있는 최대 offset (deg)
const ROTATION_LIMIT = 70;
const WHEEL_SENSITIVITY = 0.06;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function CardsPage() {
  const router = useRouter();
  const [data, setData] = useState<GenerateResult | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, AnsweredCard>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ startX: 0, startRotation: 0, moved: false });
  const suppressClickRef = useRef(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function toggleAccordion(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 이 페이지에 머무는 동안 문서 스크롤 자체를 잠금 — 아치 영역 밖에서
  // 휠/드래그를 해도 배경(페이지)이 밀려 내려가지 않도록.
  // 실제 스크롤은 html(문서 스크롤링 엘리먼트)에서 일어나므로 body와 함께 잠가야 함
  useEffect(() => {
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // 휠 스크롤 → 부채 전체 회전 (기본 페이지 스크롤은 막음)
  useEffect(() => {
    const el = spreadRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      setRotation((r) => clamp(r - delta * WHEEL_SENSITIVITY, -ROTATION_LIMIT, ROTATION_LIMIT));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data]);

  // 드래그 → 부채 전체 회전
  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragRef.current.startX;
      if (Math.abs(deltaX) > 4) dragRef.current.moved = true;
      const deltaDeg = (deltaX / ARC_RADIUS) * (180 / Math.PI);
      setRotation(clamp(dragRef.current.startRotation + deltaDeg, -ROTATION_LIMIT, ROTATION_LIMIT));
    };
    const onPointerUp = () => {
      setIsDragging(false);
      if (dragRef.current.moved) suppressClickRef.current = true;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging]);

  function handleSpreadPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startRotation: rotation, moved: false };
    setIsDragging(true);
  }

  function handleSpreadClickCapture(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  }

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


  function handleClose() {
    if (activeId !== null && !answers[activeId]) {
      setFlipped((prev) => {
        const next = new Set(prev);
        next.delete(activeId);
        return next;
      });
    }
    setActiveId(null);
  }

  function handleReset() {
    if (isResetting) return;
    setActiveId(null);
    setFlipped(new Set());
    setAnswers({});
    setRotation(0);
    sessionStorage.removeItem("interview:answers");
    setIsResetting(true);

    // Phase 1 (1000ms): 왼쪽→오른쪽 순서로 덱에 수렴 (50ms 간격 × 9장 + 이동 500ms)
    setTimeout(() => {
      setIsShuffling(true);

      // Phase 2 (400ms): 덱 셔플
      setTimeout(() => {
        setIsShuffling(false);
        // is-dealing 먼저 적용 (덱 위치 유지 상태에서 transition 준비)
        setIsDealing(true);
        // 두 프레임 뒤에 is-resetting 해제 → 덱→아치 transition 발화
        setTimeout(() => {
          setIsResetting(false);
          // 마지막 카드 도착까지 (100ms × 9 + 450ms = 1350ms)
          setTimeout(() => setIsDealing(false), 1400);
        }, 32);
      }, 400);
    }, 1000);
  }

  function persistAnswers(map: Record<number, AnsweredCard>) {
    sessionStorage.setItem(
      "interview:answers",
      JSON.stringify(Object.values(map)),
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
            width: 40px;
            height: 40px;
            border: 3px solid var(--line);
            border-top-color: var(--gold);
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const answeredList = Object.values(answers).sort(
    (a, b) => a.questionId - b.questionId,
  );
  const avgScore =
    answeredList.length > 0
      ? (
          answeredList.reduce((s, a) => s + a.evaluation.score, 0) /
          answeredList.length
        ).toFixed(1)
      : "—";

  const activeQuestion = data.questions.find((q) => q.id === activeId);

  const PUFFS = [0, 1, 2, 3, 4, 5];

  return (
    <main className="page">
      {/* 양쪽 연기 효과 */}
      <div className="smoke smoke-l" aria-hidden="true">
        {PUFFS.map((i) => (
          <span
            key={i}
            className="puff"
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="smoke smoke-r" aria-hidden="true">
        {PUFFS.map((i) => (
          <span
            key={i}
            className="puff"
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
      </div>
      <header className="top">
        <button className="back-btn" onClick={() => router.push("/")}>
          ← 처음으로
        </button>
        <div className="progress">
          <span className="count">{answeredCount}</span>
          <span className="slash">/ 10</span>
          <span className="lbl">답변 완료</span>
        </div>
        <div className="top-right">
          <button
            className="reset-btn"
            onClick={handleReset}
            disabled={isResetting || isDealing}
          >
            {isResetting ? "섞는 중…" : "↺ 다시 뽑기"}
          </button>
          <button
            className="summary-btn"
            disabled={answeredCount === 0}
            onClick={() => setShowSummary(true)}
          >
            결과 보기
          </button>
        </div>
      </header>

      <div className="intro-band">
        <div className="eyebrow">THE SPREAD</div>
        <h1 className="serif">당신을 위한 질문이 모두 준비되었습니다.</h1>
        <p>가장 먼저 뒤집고 싶은 카드를 선택해 주세요.</p>
        {data.keywords.length > 0 && (
          <div className="keywords">
            {data.keywords.map((k, i) => (
              <span className="kw" key={i}>
                #{k}
              </span>
            ))}
          </div>
        )}
      </div>

      <section
        className={`spread${isDragging ? " is-dragging" : ""}`}
        ref={spreadRef}
        onPointerDown={handleSpreadPointerDown}
        onClickCapture={handleSpreadClickCapture}
      >
        <div className={`arch-content${isResetting ? " is-resetting" : ""}${isShuffling ? " is-shuffling" : ""}${isDealing ? " is-dealing" : ""}`} key={resetKey}>
        {ARCANA.map((arc, i) => {
          const q = data.questions.find((x) => x.id === i) ?? data.questions[i];
          const ans = answers[i];
          const angle = -65 + i * (130 / 9) + rotation;
          // 카드가 순서대로(왼쪽→오른쪽) 겹치도록 — 가운데 카드가 위로 튀어나오지 않게 함
          const zIdx = i + 1;
          const deckRot = ((i - 4.5) * 2).toFixed(1);
          const collectDelay = `${i * 50}ms`;
          const dealDelay = `${(9 - i) * 100}ms`;
          return (
            <div
              key={i}
              className={`card-slot${flipped.has(i) ? " is-flipped" : ""}`}
              style={{ "--angle": `${angle.toFixed(1)}deg`, "--deck-rot": `${deckRot}deg`, "--slot-i": i, "--collect-delay": collectDelay, "--deal-delay": dealDelay, zIndex: zIdx } as React.CSSProperties}
            >
              <TarotCard
                arc={arc}
                index={i}
                flipped={flipped.has(i)}
                answered={!!ans}
                advanced={q?.difficulty === "advanced"}
                score={ans?.evaluation.score}
                category={q?.category}
                onClick={() => handleCardClick(q?.id ?? i)}
              />
            </div>
          );
        })}
        </div>
      </section>

      {/* 답변 드로어 */}
      {activeQuestion && (
        <AnswerDrawer
          question={activeQuestion}
          existing={answers[activeQuestion.id]}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}

      {/* 결과 요약 모달 */}
      {showSummary && (
        <div className="summary-backdrop" onClick={() => setShowSummary(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-actions">
              <button
                className="save-img"
                onClick={saveAsImage}
                disabled={saving}
              >
                {saving ? "저장 중…" : "📷 사진으로 저장"}
              </button>
              <button
                className="close-modal"
                onClick={() => setShowSummary(false)}
              >
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
                {answeredList.map((a) => {
                  const isOpen = expandedIds.has(a.questionId);
                  const category = data.questions.find((q) => q.id === a.questionId)?.category ?? "";
                  return (
                    <div key={a.questionId} className={`cap-item${isOpen ? " open" : ""}`}>
                      <button
                        className="cap-header"
                        onClick={() => toggleAccordion(a.questionId)}
                        aria-expanded={isOpen}
                      >
                        <div className="cap-header-info">
                          <span className="cap-arcana serif">{a.arcanaKo}</span>
                          {category && <span className="cap-category">{category}</span>}
                        </div>
                        <span className={`cap-chevron${isOpen ? " up" : ""}`}>▾</span>
                      </button>
                      {isOpen && (
                        <div className="cap-body">
                          <div className="cap-score-row">
                            <span className="cap-score serif">
                              {a.evaluation.score}<em>/10</em>
                            </span>
                            <div className="cap-score-bar">
                              <div
                                className="cap-score-fill"
                                style={{ width: `${a.evaluation.score * 10}%` }}
                              />
                            </div>
                          </div>
                          <p className="cap-q">{a.question}</p>
                          <p className="cap-summary">{a.evaluation.summary}</p>
                          {a.evaluation.improvements[0] && (
                            <p className="cap-tip">▸ {a.evaluation.improvements[0]}</p>
                          )}
                          {a.evaluation.suggestedAnswer && (
                            <div className="cap-suggested">
                              <div className="cap-suggested-label">✦ 추천 답변 예시</div>
                              <p className="cap-suggested-note">
                                내가 말한 내용만을 바탕으로 재구성한 예시입니다.
                              </p>
                              <p className="cap-suggested-text">{a.evaluation.suggestedAnswer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
          padding: 16px 20px 0;
          height: 100dvh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .top {
          flex-shrink: 0;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          margin-bottom: 10px;
        }
        .top > .back-btn {
          justify-self: start;
        }
        .top-right {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .back-btn,
        .reset-btn,
        .summary-btn {
          background: rgba(18, 8, 40, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(238, 160, 214, 0.45);
          color: var(--parchment);
          padding: 9px 16px;
          border-radius: 9px;
          font-size: 13.5px;
          transition:
            border-color 0.2s,
            background 0.2s;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }
        .back-btn:hover,
        .reset-btn:hover:not(:disabled),
        .summary-btn:hover:not(:disabled) {
          border-color: var(--gold-bright);
          background: rgba(30, 12, 60, 0.7);
        }
        .reset-btn {
          border-color: rgba(201, 162, 75, 0.45);
          color: var(--gold);
        }
        .reset-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .summary-btn {
          color: #1a0530;
          background: linear-gradient(160deg, #f3b6e0, #d98ec9);
          border: 1px solid rgba(255, 200, 240, 0.6);
          font-weight: 700;
          text-shadow: none;
          box-shadow: 0 2px 16px rgba(217, 142, 201, 0.45);
        }
        .summary-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .progress {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .progress .count {
          font-family: var(--font-display);
          font-size: 26px;
          color: var(--gold-bright);
          text-shadow: 0 0 16px rgba(243, 182, 224, 0.7);
        }
        .progress .slash {
          color: var(--mist);
          font-size: 15px;
        }
        .progress .lbl {
          font-size: 12px;
          color: var(--parchment);
          margin-left: 4px;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }

        .intro-band {
          flex-shrink: 0;
          text-align: center;
          margin-bottom: 10px;
        }
        .intro-band .eyebrow {
          font-size: 11px;
          letter-spacing: 0.4em;
          color: var(--gold-bright);
          margin-bottom: 5px;
          text-shadow: 0 0 20px rgba(243, 182, 224, 0.8);
        }
        .intro-band h1 {
          font-size: clamp(18px, 3.5vw, 28px);
          font-weight: 600;
          margin-bottom: 5px;
          text-shadow:
            0 0 60px rgba(243, 182, 224, 0.35),
            0 2px 4px rgba(0, 0, 0, 0.95),
            0 4px 16px rgba(0, 0, 0, 0.8);
        }
        .intro-band p {
          color: #ddd0f5;
          font-size: 13px;
          line-height: 1.5;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9);
        }
        .keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          margin-top: 8px;
        }
        .kw {
          font-size: 12px;
          color: #f8d0ef;
          border: 1px solid rgba(238, 160, 214, 0.5);
          padding: 5px 13px;
          border-radius: 99px;
          background: rgba(18, 8, 40, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          text-shadow: 0 0 10px rgba(243, 182, 224, 0.5);
        }

        /* ── 연기 효과 ── */
        .smoke {
          position: fixed;
          bottom: 0;
          width: 320px;
          height: 100vh;
          pointer-events: none;
          z-index: 2;
          /* 바깥(0%) → 완전히 보임, 안쪽(100%) → 투명하게 페이드 */
          -webkit-mask-image: linear-gradient(
            to right,
            black 0%,
            black 45%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            black 0%,
            black 45%,
            transparent 100%
          );
        }
        .smoke-l {
          left: 0;
        }
        /* 오른쪽은 왼쪽 패턴을 수평으로 반전 (mask도 함께 반전됨) */
        .smoke-r {
          right: 0;
          transform: scaleX(-1);
        }

        .puff {
          position: absolute;
          bottom: -15%;
          border-radius: 50%;
          filter: blur(50px);
          background: radial-gradient(
            circle at 50% 60%,
            rgba(248, 240, 255, 0.28) 0%,
            rgba(230, 210, 255, 0.12) 45%,
            transparent 72%
          );
          animation: smoke-rise linear infinite;
          animation-duration: calc(11s + var(--i) * 1.6s);
          /* 각 퍼프가 다른 위상에서 시작 → 독립적으로 흔들리는 효과 */
          animation-delay: calc(var(--i) * -2.8s);
        }
        /* 각 퍼프별 크기·위치 차별화 — 높이를 넉넉하게 */
        .puff:nth-child(1) { width: 240px; height: 460px; left: -40px; }
        .puff:nth-child(2) { width: 190px; height: 530px; left:  65px; }
        .puff:nth-child(3) { width: 280px; height: 400px; left: -20px; }
        .puff:nth-child(4) { width: 165px; height: 500px; left: 105px; }
        .puff:nth-child(5) { width: 255px; height: 440px; left:  10px; }
        .puff:nth-child(6) { width: 210px; height: 480px; left:  60px; }

        @keyframes smoke-rise {
          0%   {
            transform: translateY(0)      translateX(0px)   scaleX(0.7)  rotate(-4deg);
            opacity: 0;
          }
          6%   { opacity: 1; }
          18%  {
            transform: translateY(-15vh)  translateX(44px)  scaleX(0.85) rotate( 6deg);
          }
          36%  {
            transform: translateY(-33vh)  translateX(-48px) scaleX(1.1)  rotate(-6deg);
            opacity: 0.85;
          }
          54%  {
            transform: translateY(-52vh)  translateX(40px)  scaleX(1.4)  rotate( 5deg);
            opacity: 0.55;
          }
          72%  {
            transform: translateY(-72vh)  translateX(-34px) scaleX(1.7)  rotate(-4deg);
            opacity: 0.3;
          }
          88%  {
            transform: translateY(-92vh)  translateX(22px)  scaleX(1.95) rotate( 2deg);
            opacity: 0.1;
          }
          100% {
            transform: translateY(-116vh) translateX(-10px) scaleX(2.2)  rotate(-1deg);
            opacity: 0;
          }
        }

        /* ── 원호형 회전 카드 배열 (휠/드래그로 부채 전체가 회전) ── */
        .spread {
          --card-w: min(clamp(125px, 29dvh, 255px), 40vw);
          --R: clamp(270px, 50dvh, 520px);
          --d: clamp(170px, 38dvh, 310px);
          flex: 1;
          min-height: 0;
          position: relative;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          /* 가운데 카드 전체가 보이도록 높이 확보: (R-d) + 카드높이 + 여백 */
          height: calc(var(--R) - var(--d) + var(--card-w) * 1.5 + 30px);
          /* overflow를 여기서 잘라내면 호버 확대(scale) 시 카드 윗부분이 함께 잘림.
             극단 회전 시 카드가 화면 밖으로 나가는 것은 페이지 스크롤이 잠겨 있어
             뷰포트 자체가 걸러주므로 여기서 별도로 자를 필요가 없음 */
          margin-bottom: 30px;
          cursor: grab;
          touch-action: none;
          user-select: none;
        }
        .spread.is-dragging {
          cursor: grabbing;
        }

        .arch-content {
          position: relative;
          height: 100%;
          width: 100%;
        }

        /* ── 리셋 Phase 1: 바깥 카드부터 순서대로 덱으로 수렴 (ease-in: 가속하며 모임) ── */
        .arch-content.is-resetting .card-slot {
          left: calc(50% - var(--card-w) / 2) !important;
          bottom: 20px !important;
          transform: rotate(var(--deck-rot)) !important;
          z-index: calc(var(--slot-i, 0) + 1) !important;
          transition:
            left      0.5s cubic-bezier(0.55, 0, 1, 0.8) var(--collect-delay, 0ms),
            bottom    0.5s cubic-bezier(0.55, 0, 1, 0.8) var(--collect-delay, 0ms),
            transform 0.5s cubic-bezier(0.55, 0, 1, 0.8) var(--collect-delay, 0ms) !important;
          pointer-events: none;
        }

        /* ── 리셋 Phase 2: 덱 셔플 ── */
        .arch-content.is-resetting.is-shuffling .card-slot {
          transition: none !important;
          animation: deck-shuffle 0.38s ease-in-out forwards !important;
        }

        @keyframes deck-shuffle {
          0%   { transform: rotate(var(--deck-rot)) translateX(0)     translateY(0); }
          18%  { transform: rotate(calc(var(--deck-rot) - 10deg)) translateX(-20px) translateY(-10px); }
          42%  { transform: rotate(calc(var(--deck-rot) +  8deg)) translateX( 17px) translateY( -5px); }
          62%  { transform: rotate(calc(var(--deck-rot) -  5deg)) translateX(-10px) translateY( -2px); }
          80%  { transform: rotate(calc(var(--deck-rot) +  2deg)) translateX(  6px) translateY(  0px); }
          100% { transform: rotate(var(--deck-rot)) translateX(0)     translateY(0); }
        }

        /* ── 리셋 Phase 3: 덱에서 아치로 한 장씩 분배 ── */
        .arch-content.is-dealing .card-slot {
          transition:
            left      0.45s cubic-bezier(0.05, 0.9, 0.2, 1) var(--deal-delay, 0ms),
            bottom    0.45s cubic-bezier(0.05, 0.9, 0.2, 1) var(--deal-delay, 0ms),
            transform 0.45s cubic-bezier(0.05, 0.9, 0.2, 1) var(--deal-delay, 0ms) !important;
          z-index: calc(var(--slot-i, 0) + 20) !important;
          pointer-events: none;
        }

        .card-slot {
          position: absolute;
          width: var(--card-w);
          /* 각 카드의 하단 중심을 반지름 R인 원의 호 위에 배치 */
          left: calc(50% + var(--R) * sin(var(--angle)) - var(--card-w) / 2);
          bottom: calc(var(--R) * cos(var(--angle)) - var(--d));
          /* 호의 접선 방향으로 카드 회전 */
          transform: rotate(var(--angle));
          transform-origin: center bottom;
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
          pointer-events: auto;
        }
        .spread.is-dragging .card-slot {
          transition: none;
        }
        .card-slot:hover {
          transform: rotate(var(--angle)) translateY(-28px) scale(1.07) !important;
          z-index: 100 !important;
        }
        .card-slot.is-flipped {
          z-index: 50 !important;
        }

        /* 결과 모달 */
        .summary-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(7, 6, 14, 0.82);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-y: auto;
          padding: 28px 16px;
          animation: fade 0.25s ease;
        }
        @keyframes fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
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
          box-shadow: 0 8px 24px rgba(201, 162, 75, 0.3);
        }
        .save-img:disabled {
          opacity: 0.5;
        }
        .close-modal {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--parchment);
          width: 38px;
          height: 38px;
          border-radius: 9px;
        }

        .capture {
          background:
            radial-gradient(
              700px 300px at 50% 0%,
              rgba(201, 162, 75, 0.1),
              transparent 60%
            ),
            linear-gradient(180deg, #16132a, #0d0b1c);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 34px 28px 24px;
        }
        .cap-head {
          text-align: center;
          margin-bottom: 26px;
        }
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
        .stat-num {
          font-size: 40px;
          color: var(--gold-bright);
          line-height: 1;
        }
        .stat-lbl {
          font-size: 11px;
          color: var(--mist);
          margin-top: 4px;
          letter-spacing: 0.06em;
        }
        .stat-div {
          width: 1px;
          height: 44px;
          background: var(--line);
        }

        /* ── 아코디언 결과 목록 ── */
        .cap-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cap-item {
          border: 1px solid var(--line-soft);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          transition: border-color 0.2s;
        }
        .cap-item.open {
          border-color: rgba(238, 160, 214, 0.38);
          background: rgba(238, 160, 214, 0.03);
        }
        .cap-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        .cap-header:hover {
          background: rgba(255, 255, 255, 0.025);
        }
        .cap-header-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .cap-arcana {
          color: var(--gold);
          font-size: 15px;
          flex-shrink: 0;
        }
        .cap-category {
          font-size: 11px;
          color: #f8d0ef;
          border: 1px solid rgba(238, 160, 214, 0.4);
          padding: 3px 10px;
          border-radius: 99px;
          background: rgba(238, 160, 214, 0.07);
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .cap-chevron {
          color: var(--mist);
          font-size: 16px;
          flex-shrink: 0;
          line-height: 1;
          transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .cap-chevron.up {
          transform: rotate(180deg);
        }
        .cap-body {
          border-top: 1px solid var(--line-soft);
          padding: 14px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cap-score-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .cap-score {
          font-size: 26px;
          color: var(--gold-bright);
          line-height: 1;
        }
        .cap-score em {
          font-size: 13px;
          color: var(--mist);
          font-style: normal;
        }
        .cap-score-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 99px;
          overflow: hidden;
        }
        .cap-score-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ember), var(--gold-bright));
          border-radius: 99px;
        }
        .cap-q {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--parchment);
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
        }
        .cap-suggested {
          border: 1px solid rgba(201, 162, 75, 0.3);
          border-radius: 10px;
          padding: 12px 14px;
          background: rgba(201, 162, 75, 0.04);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cap-suggested-label {
          font-size: 12px;
          color: var(--gold-bright);
          font-weight: 600;
          letter-spacing: 0.06em;
        }
        .cap-suggested-note {
          font-size: 11.5px;
          color: var(--mist);
          opacity: 0.7;
          line-height: 1.4;
        }
        .cap-suggested-text {
          font-size: 13px;
          line-height: 1.75;
          color: var(--parchment);
          white-space: pre-wrap;
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
