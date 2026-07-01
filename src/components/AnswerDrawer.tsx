"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRecorder } from "@/lib/useRecorder";
import type { InterviewQuestion, Evaluation, AnsweredCard } from "@/lib/types";

type Phase = "intro" | "prep" | "recording" | "transcribing" | "evaluating" | "done";

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
    keywords.some((k) => k.toLowerCase() === part.toLowerCase())
      ? <mark key={i} className="kw-mark">{part}</mark>
      : part
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
  const [phase, setPhase] = useState<Phase>(existing ? "done" : "intro");
  const [flipped, setFlipped] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState(existing?.transcript ?? "");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    existing?.evaluation ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 60);
    // 카드를 오픈하자마자 답변 준비 타이머 자동 시작 (기존 답변이 없을 때만)
    if (!existing) beginPrep();
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => () => clearTimer(), []);

  function beginPrep() {
    setPhase("prep");
    setTimer(PREP_SECONDS);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearTimer(); beginRecording(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function skipPrep() { clearTimer(); beginRecording(); }

  async function beginRecording() {
    try {
      await start();
      setPhase("recording");
      setTimer(0);
      clearTimer();
      intervalRef.current = setInterval(() => {
        setTimer((t) => {
          if (t + 1 >= MAX_RECORD_SECONDS) { clearTimer(); finishRecording(); return MAX_RECORD_SECONDS; }
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
      fd.append("audio", blob, "answer.webm");
      const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
      const sttData = await sttRes.json();
      if (!sttRes.ok) throw new Error(sttData.error ?? "음성 인식 실패");
      const text: string = sttData.text ?? "";
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
    } catch (e: any) { setError(e.message); setPhase("intro"); }
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className={`card-wrap${flipped ? " flipped" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-inner">

          {/* ── 뒷면 ── */}
          <div className="back-face" aria-hidden />

          {/* ── 앞면: 질문 & 답변 ── */}
          <div className={`front-face${question.difficulty === "advanced" ? " advanced" : ""}`}>
            <button className="close" onClick={onClose} aria-label="닫기">✕</button>

            {/* 타로 카드 헤더 */}
            <div className="card-header">
              <div className="arcana-name serif">{question.arcanaKo}</div>
              <div className="divider-line" />
              <div className="keyword-wrap">
                <span className="keyword-deco">— </span>
                <span className="keyword serif">{question.category}</span>
                <span className="keyword-deco"> —</span>
              </div>
              {question.difficulty === "advanced" && (
                <div className="advanced-badge">✦ 심화 질문</div>
              )}
              <div className="divider-line" />
            </div>

            {/* 헤더 아래 남은 공간에서 세로 가운데 정렬 */}
            <div className="card-body">
              <h2 className="q-text serif">
                {highlightKeywords(question.question, question.keywords ?? [])}
              </h2>

              {(error || recError) && (
                <div className="err">⚠ {error || recError}</div>
              )}

              {phase === "intro" && (
                <div className="stage">
                  <p className="stage-desc">
                    준비 시간 <b>1분</b> 후 자동으로 녹음이 시작됩니다.<br />
                    최대 <b>2분</b>까지 답변을 녹음할 수 있어요.
                  </p>
                  <button className="primary" onClick={beginPrep}>◷ 준비 시작</button>
                </div>
              )}

              {phase === "prep" && (
                <div className="stage">
                  <div className="ring prep">
                    <div className="ring-num serif">{fmt(timer)}</div>
                    <div className="ring-label">생각을 정리하세요</div>
                  </div>
                  <button className="ghost" onClick={skipPrep}>바로 답변 시작 →</button>
                </div>
              )}

              {phase === "recording" && (
                <div className="stage">
                  <div className="ring rec">
                    <span className="rec-dot" />
                    <div className="ring-num serif">{fmt(timer)}</div>
                    <div className="ring-label">답변 녹음 중 · 최대 2:00</div>
                  </div>
                  <button className="primary stop" onClick={finishRecording}>
                    ■ 답변 마치기 &amp; 평가 받기
                  </button>
                </div>
              )}

              {(phase === "transcribing" || phase === "evaluating") && (
                <div className="stage">
                  <div className="spinner" />
                  <p className="stage-desc pulse">
                    {phase === "transcribing"
                      ? "음성을 텍스트로 옮기는 중…"
                      : "Claude가 답변을 평가하는 중…"}
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
                    <span className="serif quote">"</span>
                    {evaluation.summary}
                  </div>
                  <button className="ghost" onClick={onClose}>다음 카드 고르기 →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
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

        /* ── 3D flip wrapper ── */
        .card-wrap {
          perspective: 1400px;
          /* 바닥에 깔린 카드와 동일한 2:3 비율 기준 너비 (height = width * 1.5) */
          width: min(400px, 94vw, calc((100dvh - 64px) / 1.5));
          flex-shrink: 0;
        }

        .card-inner {
          position: relative;
          aspect-ratio: 2 / 3;
          max-height: calc(100dvh - 64px);
          transform-style: preserve-3d;
          transition: transform 0.78s cubic-bezier(0.4, 0.1, 0.2, 1);
          border-radius: 18px;
        }
        .card-wrap.flipped .card-inner { transform: rotateY(180deg); }

        /* ── 뒷면 ── */
        .back-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 18px;
          background: #14102b url('/타로 카드 뒷면.png') center center / cover no-repeat;
          border: 1px solid var(--line);
          box-shadow: 0 28px 70px rgba(0,0,0,0.65);
        }

        /* ── 앞면 ── */
        .front-face {
          position: absolute;
          inset: 0;
          transform: rotateY(180deg);
          backface-visibility: hidden;
          border-radius: 18px;
          /* 원본 이미지에 여백(비네트)이 있어 확대해 카드 테두리까지 꽉 채움 */
          background: #15122c url('/앞면 수정.png') center center / cover no-repeat;
          border: 1px solid var(--line);
          box-shadow: 0 28px 70px rgba(0,0,0,0.65);
          padding: 24px 24px 32px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        /* 헤더 아래 나머지 공간을 차지하며 내용을 세로 가운데 정렬 */
        .card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
        }

        /* ── 심화 질문 금색 카드 ── */
        .front-face.advanced {
          background:
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,162,75,0.38), transparent 65%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(201,162,75,0.12), transparent 60%),
            url('/앞면 수정.png') center center / cover no-repeat;
          border-color: rgba(201,162,75,0.7);
          box-shadow:
            0 0 0 1px rgba(201,162,75,0.35),
            0 28px 70px rgba(201,162,75,0.2),
            inset 0 1px 0 rgba(201,162,75,0.15);
        }
        .advanced-badge {
          font-size: 11px;
          letter-spacing: 0.22em;
          color: #1c1405;
          background: linear-gradient(135deg, var(--gold-bright), var(--gold));
          padding: 3px 12px;
          border-radius: 99px;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(201,162,75,0.4);
        }
        .front-face.advanced .arcana-name { color: var(--gold-bright); opacity: 1; }
        .front-face.advanced .keyword { color: #ffe8a0; }
        .front-face.advanced .keyword-deco { color: var(--gold-bright); opacity: 0.8; }
        .front-face.advanced .divider-line {
          background: linear-gradient(90deg, transparent, rgba(201,162,75,0.6), transparent);
        }
        .front-face.advanced .q-text { color: #f5e6c0; opacity: 1; }
        .front-face.advanced .stage-desc { color: rgba(245,230,192,0.7); }
        .front-face.advanced .stage-desc b { color: var(--gold-bright); }

        .close {
          position: absolute;
          top: 16px;
          right: 18px;
          background: transparent;
          border: none;
          color: var(--mist);
          font-size: 18px;
          cursor: pointer;
        }

        /* 타로 카드 헤더 */
        .card-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          padding-top: 8px;
        }
        .arcana-name {
          font-size: 13px;
          letter-spacing: 0.28em;
          color: var(--gold);
          text-transform: uppercase;
          opacity: 0.85;
        }
        .divider-line {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--line), transparent);
        }
        .keyword-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }
        .keyword {
          font-size: clamp(26px, 6vw, 36px);
          font-weight: 700;
          color: var(--gold-bright);
          letter-spacing: 0.12em;
          text-shadow:
            0 0 30px rgba(201,162,75,0.5),
            0 0 60px rgba(201,162,75,0.2);
        }
        .keyword-deco {
          font-size: 20px;
          color: var(--gold);
          opacity: 0.6;
          letter-spacing: 0;
        }

        .q-text {
          font-size: clamp(14px, 2.8vw, 17px);
          line-height: 1.6;
          margin-bottom: 20px;
          color: var(--parchment);
          text-align: center;
          opacity: 0.9;
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
          background: rgba(194,84,58,0.1);
          border: 1px solid rgba(194,84,58,0.3);
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
        .stage-desc b { color: var(--gold-bright); }
        .pulse { animation: p 1.4s ease-in-out infinite; }
        @keyframes p { 0%,100%{opacity:1} 50%{opacity:0.5} }

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
        .ring.prep { box-shadow: 0 0 0 6px rgba(201,162,75,0.06); }
        .ring.rec {
          border-color: var(--ember);
          animation: glow 1.6s ease-in-out infinite;
        }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 30px rgba(194,84,58,0.25); }
          50% { box-shadow: 0 0 55px rgba(194,84,58,0.5); }
        }
        .ring-num { font-size: 44px; color: var(--parchment); letter-spacing: 0.02em; }
        .ring-label { font-size: 12px; color: var(--mist); }
        .rec-dot {
          width: 11px; height: 11px; border-radius: 50%;
          background: var(--ember);
          animation: blink 1s steps(2) infinite;
        }
        @keyframes blink { 50% { opacity: 0.25; } }

        .primary {
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          color: var(--void);
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          border: none;
          border-radius: 11px;
          box-shadow: 0 8px 28px rgba(201,162,75,0.3);
          transition: transform 0.2s;
          cursor: pointer;
        }
        .primary:hover { transform: translateY(-2px); }
        .primary.stop {
          background: linear-gradient(180deg, #d96a50, var(--ember));
          color: var(--parchment);
          box-shadow: 0 8px 28px rgba(194,84,58,0.35);
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
        .ghost:hover { border-color: var(--gold); }

        .spinner {
          width: 44px; height: 44px;
          border: 3px solid var(--line);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .result { display: flex; flex-direction: column; gap: 20px; }
        .score-row { display: flex; align-items: center; gap: 18px; }
        .big-score { font-size: 52px; color: var(--gold-bright); line-height: 1; }
        .big-score span { font-size: 20px; color: var(--mist); }
        .score-bar {
          flex: 1; height: 10px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px; overflow: hidden;
        }
        .score-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ember), var(--gold-bright));
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.2,0.8,0.2,1);
        }
        .transcript {
          border: 1px solid var(--line-soft);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .transcript summary { cursor: pointer; font-size: 13px; color: var(--mist); }
        .transcript p { margin-top: 10px; font-size: 14px; line-height: 1.7; color: var(--parchment); }
        .feedback { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 500px) { .feedback { grid-template-columns: 1fr; } }
        .fb-block { border: 1px solid var(--line-soft); border-radius: 12px; padding: 16px 18px; }
        .fb-block h4 { font-size: 13px; letter-spacing: 0.04em; margin-bottom: 10px; }
        .fb-block.good h4 { color: var(--gold-bright); }
        .fb-block.improve h4 { color: var(--ember); }
        .fb-block ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .fb-block li {
          font-size: 13.5px; line-height: 1.6; color: var(--parchment);
          padding-left: 16px; position: relative;
        }
        .fb-block li::before { content: "·"; position: absolute; left: 4px; color: var(--gold); }
        .summary {
          font-size: 15px; line-height: 1.7; color: var(--mist);
          border-left: 2px solid var(--gold); padding-left: 16px;
        }
        .summary .quote { color: var(--gold); font-size: 28px; margin-right: 4px; line-height: 0; }
      `}</style>
    </div>
  );
}
