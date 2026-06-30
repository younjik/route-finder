"use client";

import { useEffect, useRef, useState } from "react";
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
  const { recording, error: recError, start, stop } = useRecorder();
  const [phase, setPhase] = useState<Phase>(existing ? "done" : "intro");
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState(existing?.transcript ?? "");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    existing?.evaluation ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  useEffect(() => () => clearTimer(), []);

  // 준비 시간 시작
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
      // STT
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
      const sttData = await sttRes.json();
      if (!sttRes.ok) throw new Error(sttData.error ?? "음성 인식 실패");
      const text: string = sttData.text ?? "";
      setTranscript(text);

      // 평가
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

      const card: AnsweredCard = {
        questionId: question.id,
        arcanaKo: question.arcanaKo,
        question: question.question,
        transcript: text,
        evaluation: ev,
        answeredAt: Date.now(),
      };
      onSaved(card);
    } catch (e: any) {
      setError(e.message);
      setPhase("intro");
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <button className="close" onClick={onClose} aria-label="닫기">✕</button>

        <div className="q-meta">
          <span className="q-arcana serif">{question.arcanaKo}</span>
          <span className="q-cat">{question.category}</span>
        </div>
        <h2 className="q-text serif">{question.question}</h2>

        {(error || recError) && (
          <div className="err">⚠ {error || recError}</div>
        )}

        {/* 상태별 UI */}
        {phase === "intro" && (
          <div className="stage">
            <p className="stage-desc">
              준비 시간 <b>1분</b> 후 자동으로 녹음이 시작됩니다.
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
                <div
                  className="score-fill"
                  style={{ width: `${evaluation.score * 10}%` }}
                />
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
                <ul>
                  {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="fb-block improve">
                <h4>개선할 점</h4>
                <ul>
                  {evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div className="summary">
              <span className="serif quote">“</span>
              {evaluation.summary}
            </div>

            <button className="ghost" onClick={onClose}>
              다음 카드 고르기 →
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(7, 6, 14, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-end;
          animation: fade 0.25s ease;
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .drawer {
          position: relative;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          max-height: 88vh;
          overflow-y: auto;
          background:
            radial-gradient(800px 400px at 50% 0%, rgba(201,162,75,0.1), transparent 60%),
            linear-gradient(180deg, #1a1633, #110e24);
          border: 1px solid var(--line);
          border-bottom: none;
          border-radius: 22px 22px 0 0;
          padding: 16px 26px 40px;
          animation: rise 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes rise { from { transform: translateY(40px); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
        .grabber {
          width: 46px;
          height: 4px;
          border-radius: 99px;
          background: var(--line);
          margin: 4px auto 18px;
        }
        .close {
          position: absolute;
          top: 16px;
          right: 18px;
          background: transparent;
          border: none;
          color: var(--mist);
          font-size: 18px;
        }
        .q-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .q-arcana {
          color: var(--gold);
          font-size: 16px;
        }
        .q-cat {
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--mist);
          border: 1px solid var(--line-soft);
          padding: 2px 9px;
          border-radius: 99px;
        }
        .q-text {
          font-size: clamp(20px, 4vw, 26px);
          line-height: 1.4;
          margin-bottom: 22px;
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
          width: 190px;
          height: 190px;
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
          box-shadow: 0 0 40px rgba(194,84,58,0.3);
          animation: glow 1.6s ease-in-out infinite;
        }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 30px rgba(194,84,58,0.25); }
          50% { box-shadow: 0 0 55px rgba(194,84,58,0.5); }
        }
        .ring-num { font-size: 46px; color: var(--parchment); letter-spacing: 0.02em; }
        .ring-label { font-size: 12.5px; color: var(--mist); }
        .rec-dot {
          width: 11px; height: 11px; border-radius: 50%;
          background: var(--ember);
          animation: blink 1s steps(2) infinite;
        }
        @keyframes blink { 50% { opacity: 0.25; } }

        .primary {
          padding: 15px 30px;
          font-size: 15.5px;
          font-weight: 600;
          color: var(--void);
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          border: none;
          border-radius: 11px;
          box-shadow: 0 8px 28px rgba(201,162,75,0.3);
          transition: transform 0.2s;
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

        /* 결과 */
        .result { display: flex; flex-direction: column; gap: 20px; }
        .score-row { display: flex; align-items: center; gap: 18px; }
        .big-score { font-size: 52px; color: var(--gold-bright); line-height: 1; }
        .big-score span { font-size: 20px; color: var(--mist); }
        .score-bar {
          flex: 1;
          height: 10px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px;
          overflow: hidden;
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
        .feedback {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 540px) {
          .feedback { grid-template-columns: 1fr; }
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
        .fb-block.good h4 { color: var(--gold-bright); }
        .fb-block.improve h4 { color: var(--ember); }
        .fb-block ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
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
          font-size: 15px;
          line-height: 1.7;
          color: var(--mist);
          border-left: 2px solid var(--gold);
          padding-left: 16px;
          position: relative;
        }
        .summary .quote {
          color: var(--gold);
          font-size: 28px;
          margin-right: 4px;
          line-height: 0;
        }
      `}</style>
    </div>
  );
}
