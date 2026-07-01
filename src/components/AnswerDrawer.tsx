"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRecorder } from "@/lib/useRecorder";
import { ARCANA } from "@/lib/arcana";
import type { InterviewQuestion, Evaluation, AnsweredCard } from "@/lib/types";

type Phase =
  | "intro"
  | "prep"
  | "recording"
  | "transcribing"
  | "evaluating"
  | "done";

const PREP_SECONDS = 60;
const MAX_RECORD_SECONDS = 120;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;
  const escaped = keywords
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} className="kw-mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function AnswerDrawer({
  question,
  existing,
  onClose,
  onSaved,
}: {
  question: InterviewQuestion;
  existing?: AnsweredCard;
  onClose: () => void;
  onSaved: (card: AnsweredCard) => void;
}) {
  const { error: recError, start, stop } = useRecorder();
  const [phase, setPhase] = useState<Phase>(existing ? "done" : "prep");
  const [flipped, setFlipped] = useState(false);
  const [questionHidden, setQuestionHidden] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState(existing?.transcript ?? "");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    existing?.evaluation ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [resultMode, setResultMode] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const arcMeta = ARCANA[question.id];
  const hint = question.hint;

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 60);
    if (!existing) {
      setTimer(PREP_SECONDS);
      intervalRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearTimer(); beginRecording(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { clearTimeout(t1); clearTimer(); };
  }, []);

  useEffect(() => {
    if (phase === "done") {
      // existing 카드 재열람 시 플립 애니메이션(~840ms) 완료 후 확장, 신규 평가는 즉시
      const delay = existing ? 920 : 0;
      const t = setTimeout(() => setResultMode(true), delay);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function clearTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  useEffect(() => () => { clearTimer(); }, []);

  function beginPrep() {
    setPhase("prep");
    setTimer(PREP_SECONDS);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearTimer();
          beginRecording();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function skipPrep() {
    clearTimer();
    beginRecording();
  }

  async function beginRecording() {
    try {
      await start();
      setPhase("recording");
      setTimer(0);
      clearTimer();
      intervalRef.current = setInterval(() => {
        setTimer((t) => {
          if (t + 1 >= MAX_RECORD_SECONDS) {
            clearTimer();
            finishRecording();
            return MAX_RECORD_SECONDS;
          }
          return t + 1;
        });
      }, 1000);
    } catch {
      setPhase("intro");
    }
  }

  async function finishRecording() {
    clearTimer();
    let blob: Blob;
    try {
      blob = await stop();
    } catch (e: any) {
      setError(e.message);
      return;
    }

    setPhase("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "answer.wav");
      const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
      const sttData = await sttRes.json();
      if (!sttRes.ok) throw new Error(sttData.error ?? "음성 인식 실패");
      const text: string = sttData.text ?? "";
      if (!text.trim()) {
        throw new Error(
          "답변 음성이 인식되지 않았습니다. 마이크에 더 가까이서, 조금 더 크고 또렷하게 다시 답변해 주세요.",
        );
      }
      setTranscript(text);

      setPhase("evaluating");
      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.question, transcript: text }),
      });
      const evalData = await evalRes.json();
      if (!evalRes.ok) throw new Error(evalData.error ?? "평가 실패");
      const ev = evalData as Evaluation;
      setEvaluation(ev);
      setPhase("done");

      onSaved({
        questionId: question.id,
        arcanaKo: question.arcanaKo,
        question: question.question,
        transcript: text,
        evaluation: ev,
        answeredAt: Date.now(),
      });
    } catch (e: any) {
      setError(e.message);
      setPhase("intro");
    }
  }

  // 테스트용: 마이크 녹음도, Claude 분석 API 호출도 없이 더미 결과 화면만 바로 확인
  function skipToResultForTesting() {
    clearTimer();
    const dummyTranscript = "(테스트) 마이크 녹음 없이 결과 화면을 확인하기 위한 더미 답변입니다.";
    const dummyEvaluation: Evaluation = {
      score: 7,
      strengths: ["(데모) 답변 구조가 명확합니다.", "(데모) 핵심 키워드를 잘 짚었습니다."],
      improvements: ["(데모) 구체적인 수치나 사례를 더 추가하면 좋겠습니다.", "(데모) 결론을 조금 더 간결하게 정리해보세요."],
      summary: "(데모) 이 결과는 Claude 분석 없이 생성된 테스트용 더미 데이터입니다.",
      suggestedAnswer: "(데모) 실제 API 연동 시 이 자리에 답변 기반 추천 예시가 표시됩니다.",
    };
    setTranscript(dummyTranscript);
    setEvaluation(dummyEvaluation);
    setPhase("done");

    onSaved({
      questionId: question.id,
      arcanaKo: question.arcanaKo,
      question: question.question,
      transcript: dummyTranscript,
      evaluation: dummyEvaluation,
      answeredAt: Date.now(),
    });
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="split-wrap" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="닫기">
          <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>

        {/* ── 1열: 뽑힌 카드 ── */}
        <div className="card-col">
          <div className={`card-wrap${flipped ? " flipped" : ""}`}>
            <div className="card-inner">
              {/* ── 뒷면 ── */}
              <div className="back-face" aria-hidden>
                <div className="back-frame">
                  <div className="back-glyph serif">✶</div>
                  <div className="back-lines" />
                </div>
              </div>

              {/* ── 앞면: 카드 주제/키워드만 표시 (질문 본문은 우측 패널) ── */}
              <div className={`front-face${question.difficulty === "advanced" ? " advanced" : ""}`}>
                <div className="card-header">
                  <div className="divider-line" />
                  {question.difficulty === "advanced" && (
                    <div className="advanced-badge">✦ 심화 질문</div>
                  )}
                </div>
                <div className="card-center">
                  {arcMeta && <div className="card-glyph serif">{arcMeta.glyph}</div>}
                  <div className="keyword-wrap">
                    <span className="keyword-deco">— </span>
                    <span className="keyword serif">{question.category}</span>
                    <span className="keyword-deco"> —</span>
                  </div>
                </div>
                <div className="divider-line" />
              </div>
            </div>
          </div>
        </div>

        {/* ── 2·3열: 질문 · 타이머 · 힌트 ── */}
        <div className={`content-col${question.difficulty === "advanced" ? " advanced" : ""}`}>
          <div className="content-scroll">
            <div className="q-wrap">
              <h2 className={`q-text serif${questionHidden && phase !== "done" ? " q-hidden" : ""}`}>
                {highlightKeywords(question.question, question.keywords ?? [])}
              </h2>
              {phase !== "done" && (
                <button
                  type="button"
                  className="q-toggle"
                  onClick={() => setQuestionHidden((v) => !v)}
                >
                  {questionHidden ? (
                    <>
                      <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.6 20.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.7 20.7 0 0 1-3.22 4.36M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                      질문 보기
                    </>
                  ) : (
                    "질문 가리기"
                  )}
                </button>
              )}
            </div>

            {(error || recError) && (
              <div className="err">⚠ {error || recError}</div>
            )}

            {phase === "intro" && (
              <div className="stage">
                <p className="stage-desc">
                  준비 시간 <b>1분</b> 후 자동으로 녹음이 시작됩니다.
                  <br />
                  최대 <b>2분</b>까지 답변을 녹음할 수 있어요.
                </p>
                <button className="primary" onClick={beginPrep}>
                  ◷ 준비 시작
                </button>
              </div>
            )}

            {phase === "prep" && (
              <div className="stage">
                <div className="ring prep">
                  <div className="ring-num serif">{fmt(timer)}</div>
                  <div className="ring-label">생각을 정리하세요</div>
                </div>
                <button className="ghost" onClick={skipPrep}>
                  바로 답변 시작 →
                </button>
              </div>
            )}

            {phase === "recording" && (
              <div className="stage">
                <div className="ring rec">
                  <span className="rec-dot" />
                  <div className="ring-num serif">{fmt(timer)}</div>
                  <div className="ring-label">답변 녹음 중 · 최대 2:00</div>
                </div>
                <p className="warn-note">⚠ 답변 중 창을 닫으면 기록되지 않습니다.</p>
                <button className="primary stop" onClick={finishRecording}>
                  ■ 답변 마치기 &amp; 평가 받기
                </button>
              </div>
            )}

              {process.env.NODE_ENV !== "production" &&
                (phase === "intro" || phase === "prep" || phase === "recording") && (
                  <button className="dev-skip" onClick={skipToResultForTesting}>
                    🧪 테스트: 마이크 없이 결과 화면 바로가기
                  </button>
                )}

            {(phase === "transcribing" || phase === "evaluating") && (
              <div className="stage">
                <div className="spinner" />
                <p className="stage-desc pulse">
                  {phase === "transcribing"
                    ? "음성을 텍스트로 옮기는 중…"
                    : "당신의 가능성을 비추는 중 ..."}
                </p>
              </div>
            )}

            {phase === "done" && evaluation && (
              <div className="result">
                <div className="score-row">
                  <div className="big-score serif">{evaluation.score}<span>/10</span></div>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${evaluation.score * 10}%` }} />
                  </div>
                </div>
                {transcript && (
                  <details className="transcript">
                    <summary>내 답변 (변환 텍스트)</summary>
                    <p>{transcript}</p>
                  </details>
                )}
                <div className="feedback">
                  <div className="fb-block good">
                    <h4>잘한 점</h4>
                    <ul>{evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div className="fb-block improve">
                    <h4>개선할 점</h4>
                    <ul>{evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
                <div className="summary">
                  {evaluation.summary}
                </div>
                {evaluation.suggestedAnswer && (
                  <details className="suggested">
                    <summary>✦ 추천 답변 예시 보기</summary>
                    <p className="suggested-note">
                      내가 말한 내용을 바탕으로 재구성한 예시입니다. 새로운 사실은 추가되지 않았습니다.
                    </p>
                    <p className="suggested-text">{evaluation.suggestedAnswer}</p>
                  </details>
                )}
                <button className="ghost" onClick={onClose}>다음 카드 고르기 →</button>
              </div>
            )}

            {hint && (phase === "intro" || phase === "prep" || phase === "recording") && (
              <div className="hint-panel">
                <button
                  type="button"
                  className="hint-toggle"
                  onClick={() => setHintOpen((v) => !v)}
                  aria-expanded={hintOpen}
                >
                  {hintOpen ? "힌트 숨기기 ▴" : "💡 면접 힌트 보기 ▾"}
                </button>
                {hintOpen && (
                  <div className="hint-body">
                    {hint.keywords.length > 0 && (
                      <div className="hint-block">
                        <h5>핵심 키워드</h5>
                        <div className="hint-kw-list">
                          {hint.keywords.map((k, i) => (
                            <span className="hint-kw" key={i}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(hint.star.situation || hint.star.task || hint.star.action || hint.star.result) && (
                      <div className="hint-block">
                        <h5>STAR 기법으로 답변 구성하기</h5>
                        <ul className="star-list">
                          <li><b>S</b><span>{hint.star.situation}</span></li>
                          <li><b>T</b><span>{hint.star.task}</span></li>
                          <li><b>A</b><span>{hint.star.action}</span></li>
                          <li><b>R</b><span>{hint.star.result}</span></li>
                        </ul>
                      </div>
                    )}
                    {hint.sampleAnswer && (
                      <div className="hint-block">
                        <h5>답변 예시</h5>
                        <p className="hint-sample">{hint.sampleAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 500;
          background: rgba(7, 6, 14, 0.78);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          overflow-y: auto;
          animation: fade 0.2s ease;
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

        /* ── 3분할 레이아웃 ── */
        .split-wrap {
          /* 카드와 오른쪽 패널의 높이를 항상 동일하게 유지하는 기준값 (내용 길이와 무관) */
          --card-h: min(600px, 141vw, calc(100dvh - 64px));
          position: relative;
          display: flex;
          align-items: stretch;
          gap: 22px;
          width: min(1040px, 96vw);
          max-height: calc(100dvh - 48px);
        }
        @media (max-width: 760px) {
          .split-wrap {
            flex-direction: column;
            align-items: center;
            max-height: none;
          }
        }

        .close {
          position: absolute;
          top: -14px;
          right: -14px;
          z-index: 10;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(18, 8, 40, 0.85);
          border: 1px solid var(--line);
          border-radius: 50%;
          color: var(--parchment);
          font-size: 15px;
          cursor: pointer;
        }
        .close:hover { border-color: var(--gold); color: var(--gold-bright); }
        .close-icon { width: 15px; height: 15px; }

        /* ── 1열: 뽑힌 카드 ── */
        .card-col {
          /* 카드 실제 크기(.card-wrap)에 맞춰 칼럼 너비도 자동으로 맞춤 —
             고정 30%/300px로 두면 카드가 더 클 때 옆 칼럼과 겹침 */
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 760px) {
          .card-col { flex: none; width: 100%; max-width: 240px; align-items: flex-start; }
        }

        /* ── 2·3열: 질문 · 타이머 · 힌트 ── */
        .content-col {
          flex: 1;
          min-width: 0;
          display: flex;
          background: linear-gradient(180deg, #1a1633, #110e24);
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 28px 70px rgba(0,0,0,0.65);
          height: var(--card-h);
          overflow: hidden;
        }
        @media (max-width: 760px) {
          .content-col { height: auto; max-height: none; width: 100%; }
        }
        .content-scroll {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 30px 32px 34px;
          display: flex;
          flex-direction: column;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .content-scroll::-webkit-scrollbar { display: none; }
        .content-col.advanced .q-text { color: #f5e6c0; opacity: 1; }
        .content-col.advanced .stage-desc { color: rgba(245,230,192,0.7); }
        .content-col.advanced .stage-desc b { color: var(--gold-bright); }

        /* ── 3D flip wrapper ── */
        .card-wrap {
          perspective: 1400px;
          /* 오른쪽 패널과 동일한 --card-h를 기준으로 한 2:3 비율 너비 (height = width * 1.5) */
          width: min(calc(var(--card-h) / 1.5), 94vw);
          flex-shrink: 0;
        }
        @media (max-width: 760px) {
          .card-wrap { width: 100%; }
        }

        .card-inner {
          position: relative;
          aspect-ratio: 2 / 3;
          max-height: var(--card-h);
          transform-style: preserve-3d;
          transition: transform 0.78s cubic-bezier(0.4, 0.1, 0.2, 1);
          border-radius: 18px;
        }
        .card-wrap.flipped .card-inner {
          transform: rotateY(180deg);
        }

        /* ── 결과 모드: 고정 비율 해제, 콘텐츠 높이로 자연 확장 ── */
        .card-wrap.result-mode {
          width: min(420px, 94vw);
        }
        .card-wrap.result-mode .card-inner {
          aspect-ratio: auto !important;
          max-height: none !important;
          transform: none !important;
          transition: none !important;
          transform-style: flat !important;
        }
        .card-wrap.result-mode .back-face {
          display: none;
        }
        .card-wrap.result-mode .front-face {
          position: relative !important;
          inset: auto !important;
          transform: none !important;
          overflow-y: visible !important;
          height: auto !important;
        }
        .card-wrap.result-mode .card-body {
          justify-content: flex-start;
        }

        /* ── 뒷면 ── */
        .back-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 18px;
          background: #14102b url("/타로 카드 뒷면.png") center center / cover
            no-repeat;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
        }

        /* ── 앞면 ── */
        .front-face {
          position: absolute;
          inset: 0;
          transform: rotateY(180deg);
          backface-visibility: hidden;
          border-radius: 18px;
          /* 일반 질문 카드 — 원본 이미지 여백(상 5%/하 8.3%)에 맞춰
             확대 110% + 세로 위치 32%로 보정 (심화 카드와 동일 비율/위치) */
          background: #15122c url("/보라색 카드 앞면.png") 50% 38% / 119% 112%
            no-repeat;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
          padding: 24px 24px 32px;
          overflow-y: auto;
          scrollbar-width: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
        }
        .front-face::-webkit-scrollbar { display: none; }

        /* 카드 중앙: 글리프 · 주제 · 키워드 */
        .card-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
        }
        .card-glyph {
          font-size: clamp(34px, 8vw, 52px);
          color: var(--gold-bright);
          text-shadow: 0 0 30px rgba(201,162,75,0.5);
        }
        .front-face.advanced .card-glyph { color: #ffe8a0; }

        /* ── 심화 질문 금색 카드 ── */
        .front-face.advanced {
          background:
            radial-gradient(
              ellipse 80% 50% at 50% 0%,
              rgba(201, 162, 75, 0.38),
              transparent 65%
            ),
            radial-gradient(
              ellipse 60% 40% at 50% 100%,
              rgba(201, 162, 75, 0.12),
              transparent 60%
            ),
            url("/앞면 수정.png") 50% 38% / 119% 112% no-repeat;
          box-shadow:
            0 28px 70px rgba(201, 162, 75, 0.2),
            inset 0 1px 0 rgba(201, 162, 75, 0.15);
        }
        .advanced-badge {
          font-size: 11px;
          letter-spacing: 0.22em;
          color: #1c1405;
          background: #ffe8a0;
          padding: 3px 12px;
          border-radius: 99px;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(201, 162, 75, 0.4);
        }
        .front-face.advanced .keyword {
          color: #ffe8a0;
        }
        .front-face.advanced .keyword-deco {
          color: #ffe8a0;
          opacity: 0.8;
        }
        .front-face.advanced .divider-line {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(201, 162, 75, 0.6),
            transparent
          );
        }
        .front-face.advanced .q-text {
          color: #f5e6c0;
          opacity: 1;
        }
        .front-face.advanced .stage-desc {
          color: rgba(245, 230, 192, 0.7);
        }
        .front-face.advanced .stage-desc b {
          color: var(--gold-bright);
        }

        /* 타로 카드 헤더 */
        .card-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .divider-line {
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--line),
            transparent
          );
        }
        .keyword-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }
        .keyword {
          font-size: clamp(19px, 5vw, 27px);
          font-weight: 700;
          color: var(--gold-bright);
          letter-spacing: 0.12em;
          text-shadow:
            0 0 30px rgba(201, 162, 75, 0.5),
            0 0 60px rgba(201, 162, 75, 0.2);
        }
        .keyword-deco {
          font-size: 20px;
          color: var(--gold);
          opacity: 0.6;
          letter-spacing: 0;
        }

        .q-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .q-text {
          font-size: clamp(18px, 2.4vw, 23px);
          line-height: 1.6;
          margin-bottom: 0;
          color: var(--parchment);
          text-align: left;
          opacity: 0.95;
          word-break: keep-all;
          overflow-wrap: break-word;
          transition: filter 0.2s;
        }
        .q-text.q-hidden {
          filter: blur(9px);
          user-select: none;
        }
        .q-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid var(--line);
          color: var(--mist);
          padding: 6px 13px;
          border-radius: 8px;
          font-size: 12.5px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .q-toggle:hover {
          border-color: var(--gold);
          color: var(--gold-bright);
        }
        .eye-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }
        .q-text :global(.kw-mark) {
          background: none;
          color: var(--gold-bright);
          font-style: italic;
          border-bottom: 1px solid rgba(201, 162, 75, 0.55);
          padding-bottom: 1px;
        }
        .err {
          color: var(--ember);
          background: rgba(194, 84, 58, 0.1);
          border: 1px solid rgba(194, 84, 58, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13.5px;
          margin-bottom: 16px;
        }
        .stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          padding: 18px 0 6px;
        }
        .stage-desc {
          color: var(--mist);
          font-size: 14.5px;
          line-height: 1.7;
          text-align: center;
          max-width: 420px;
        }
        .stage-desc b {
          color: var(--gold-bright);
        }
        .warn-note {
          font-size: 12.5px;
          color: var(--ember);
          opacity: 0.85;
          text-align: center;
          margin-top: -8px;
        }
        .pulse {
          animation: p 1.4s ease-in-out infinite;
        }
        @keyframes p {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .ring {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          position: relative;
          border: 2px solid var(--line);
        }
        .ring.prep {
          box-shadow: 0 0 0 6px rgba(201, 162, 75, 0.06);
        }
        .ring.rec {
          border-color: var(--ember);
          animation: glow 1.6s ease-in-out infinite;
        }
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 30px rgba(194, 84, 58, 0.25);
          }
          50% {
            box-shadow: 0 0 55px rgba(194, 84, 58, 0.5);
          }
        }
        .ring-num {
          font-size: 44px;
          color: var(--parchment);
          letter-spacing: 0.02em;
        }
        .ring-label {
          font-size: 12px;
          color: var(--mist);
        }
        .rec-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: var(--ember);
          animation: blink 1s steps(2) infinite;
        }
        @keyframes blink {
          50% {
            opacity: 0.25;
          }
        }

        .primary {
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          color: var(--void);
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          border: none;
          border-radius: 11px;
          box-shadow: 0 8px 28px rgba(201, 162, 75, 0.3);
          transition: transform 0.2s;
          cursor: pointer;
        }
        .primary:hover {
          transform: translateY(-2px);
        }
        .primary.stop {
          background: linear-gradient(180deg, #d96a50, var(--ember));
          color: var(--parchment);
          box-shadow: 0 8px 28px rgba(194, 84, 58, 0.35);
        }
        .ghost {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--gold-bright);
          padding: 11px 22px;
          border-radius: 10px;
          font-size: 14px;
          transition: border-color 0.2s;
          cursor: pointer;
        }
        .ghost:hover {
          border-color: var(--gold);
        }

        /* 개발 중 테스트용 — 마이크 없이 결과로 바로가기 */
        .dev-skip {
          margin-top: 10px;
          background: transparent;
          border: 1px dashed rgba(224, 113, 159, 0.5);
          color: var(--ember);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .dev-skip:hover {
          border-color: var(--ember);
        }

        .spinner {
          width: 44px;
          height: 44px;
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

        .result {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .score-row {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .big-score {
          font-size: 52px;
          color: var(--gold-bright);
          line-height: 1;
        }
        .big-score span {
          font-size: 20px;
          color: var(--mist);
        }
        .score-bar {
          flex: 1;
          height: 10px;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 99px;
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ember), var(--gold-bright));
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .transcript {
          border: 1px solid var(--line-soft);
          border-radius: 10px;
          padding: 10px 14px;
        }
        .transcript summary {
          cursor: pointer;
          font-size: 13px;
          color: var(--mist);
        }
        .transcript p {
          margin-top: 10px;
          font-size: 14px;
          line-height: 1.7;
          color: var(--parchment);
        }
        .suggested {
          border: 1px solid rgba(201, 162, 75, 0.35);
          border-radius: 10px;
          padding: 10px 14px;
        }
        .suggested summary {
          cursor: pointer;
          font-size: 13px;
          color: var(--gold-bright);
        }
        .suggested-note {
          margin-top: 10px;
          font-size: 12px;
          color: var(--mist);
        }
        .suggested-text {
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.7;
          color: var(--parchment);
        }
        .feedback {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 500px) {
          .feedback {
            grid-template-columns: 1fr;
          }
        }
        .fb-block {
          border: 1px solid var(--line-soft);
          border-radius: 12px;
          padding: 16px 18px;
        }
        .fb-block h4 {
          font-size: 13px;
          letter-spacing: 0.04em;
          margin-bottom: 10px;
        }
        .fb-block.good h4 {
          color: var(--gold-bright);
        }
        .fb-block.improve h4 {
          color: var(--ember);
        }
        .fb-block ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fb-block li {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--parchment);
          padding-left: 16px;
          position: relative;
        }
        .fb-block li::before {
          content: "·";
          position: absolute;
          left: 4px;
          color: var(--gold);
        }
        .summary {
          font-size: 14.5px; line-height: 1.7; color: var(--mist);
          border-left: 2px solid var(--gold); padding-left: 16px;
        }

        /* ── 면접 힌트 ── */
        .hint-panel {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid var(--line-soft);
        }
        .hint-toggle {
          box-sizing: border-box;
          width: 190px;
          height: 40px;
          line-height: 1;
          background: transparent;
          border: 1px solid var(--line);
          color: var(--gold-bright);
          padding: 0 16px;
          border-radius: 9px;
          font-size: 13.5px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .hint-toggle:hover { border-color: var(--gold); }
        .hint-body {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          animation: fade 0.2s ease;
        }
        .hint-block h5 {
          font-size: 11.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 9px;
        }
        .hint-kw-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .hint-kw {
          font-size: 12.5px;
          color: var(--gold-bright);
          background: rgba(201,162,75,0.1);
          border: 1px solid rgba(201,162,75,0.3);
          padding: 4px 11px;
          border-radius: 99px;
        }
        .star-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .star-list li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--parchment);
        }
        .star-list b {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(201,162,75,0.15);
          color: var(--gold-bright);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
        }
        .hint-sample {
          font-size: 13.5px;
          line-height: 1.75;
          color: var(--mist);
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 13px 15px;
        }
      `}</style>
    </div>
  );
}
