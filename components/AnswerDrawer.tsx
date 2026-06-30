"use client";

import { useCallback, useRef } from "react";
import { InterviewQuestion, EvaluationResult } from "@/lib/claude";
import { blobToPCM16kHz } from "@/lib/audio";

export type DrawerPhase =
  | { t: "question" }
  | { t: "recording"; interim: string }
  | { t: "transcribed"; text: string }
  | { t: "evaluating"; text: string }
  | { t: "evaluated"; text: string; evaluation: EvaluationResult };

const CATEGORY_LABEL: Record<string, string> = {
  인성: "인성",
  기술_직무: "기술 / 직무",
  경험: "경험",
};

const CATEGORY_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  인성:    { bg: "rgba(107,33,168,0.4)",  border: "rgba(167,139,250,0.35)", color: "#e9d5ff" },
  기술_직무:{ bg: "rgba(30,64,175,0.4)",  border: "rgba(147,197,253,0.35)", color: "#bfdbfe" },
  경험:    { bg: "rgba(6,78,59,0.4)",     border: "rgba(110,231,183,0.35)", color: "#a7f3d0" },
};

interface Props {
  question: InterviewQuestion;
  phase: DrawerPhase;
  error: string | null;
  onPhaseChange: (p: DrawerPhase) => void;
  onAnswerSaved: (transcript: string, evaluation: EvaluationResult) => void;
  onClose: () => void;
}

const USE_NAVER = process.env.NEXT_PUBLIC_STT_PROVIDER === "naver";

export default function AnswerDrawer({ question, phase, error, onPhaseChange, onAnswerSaved, onClose }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalRef = useRef("");

  /* ── Web Speech API ── */
  const startWebSpeech = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("Chrome 또는 Edge를 사용해주세요."); return; }

    finalRef.current = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = new SR();
    r.lang = "ko-KR";
    r.continuous = true;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onPhaseChange({ t: "recording", interim: finalRef.current + interim });
    };
    r.onerror = () => onPhaseChange({ t: "question" });
    r.onend = () => {
      const text = finalRef.current.trim();
      if (text) onPhaseChange({ t: "transcribed", text });
      else onPhaseChange({ t: "question" });
    };
    r.start();
    recognitionRef.current = r;
    onPhaseChange({ t: "recording", interim: "" });
  }, [onPhaseChange]);

  /* ── Naver Clova ── */
  const startNaver = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const pcm = await blobToPCM16kHz(blob);
          const res = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": "audio/pcm" }, body: pcm });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          const text = (data.text as string).trim();
          if (text) onPhaseChange({ t: "transcribed", text });
          else onPhaseChange({ t: "question" });
        } catch { onPhaseChange({ t: "question" }); }
      };
      recorder.start();
      recorderRef.current = recorder;
      onPhaseChange({ t: "recording", interim: "🎙 녹음 중..." });
    } catch { alert("마이크 권한이 필요합니다."); }
  }, [onPhaseChange]);

  const handleStart = USE_NAVER ? startNaver : startWebSpeech;

  const handleStop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
  }, []);

  /* ── Claude 평가 ── */
  const handleEvaluate = useCallback(async () => {
    if (phase.t !== "transcribed") return;
    const text = phase.text;
    onPhaseChange({ t: "evaluating", text });
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.question, answer: text, category: question.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const evaluation: EvaluationResult = data.evaluation;
      onAnswerSaved(text, evaluation);
      onPhaseChange({ t: "evaluated", text, evaluation });
    } catch { onPhaseChange({ t: "transcribed", text }); }
  }, [phase, question, onPhaseChange, onAnswerSaved]);

  const catStyle = CATEGORY_STYLE[question.category] ?? CATEGORY_STYLE["인성"];

  return (
    <div className="drawer-enter p-6 pb-10">
      {/* 핸들 */}
      <div className="flex justify-center mb-6">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(109,40,217,0.4)" }} />
      </div>

      {/* 카테고리 + 질문 */}
      <div className="mb-7">
        <span
          className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3"
          style={{ background: catStyle.bg, border: `1px solid ${catStyle.border}`, color: catStyle.color }}
        >
          {CATEGORY_LABEL[question.category]}
        </span>
        <p className="text-base font-semibold leading-relaxed" style={{ color: "rgba(253,230,138,0.92)" }}>
          {question.question}
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: "rgba(127,29,29,0.4)", border: "1px solid rgba(185,28,28,0.3)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* ── 질문 단계 ── */}
      {phase.t === "question" && (
        <div className="flex flex-col items-center gap-5 py-6">
          <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
            마이크 버튼을 눌러 답변을 시작하세요
          </p>
          <button
            onClick={handleStart}
            aria-label="녹음 시작"
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-200 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #b45309, #78350f)",
              boxShadow: "0 0 24px rgba(180,83,9,0.5), 0 0 48px rgba(180,83,9,0.2)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 36px rgba(217,119,6,0.7), 0 0 72px rgba(180,83,9,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(180,83,9,0.5), 0 0 48px rgba(180,83,9,0.2)"; }}
          >
            🎤
          </button>
        </div>
      )}

      {/* ── 녹음 중 ── */}
      {phase.t === "recording" && (
        <div className="flex flex-col items-center gap-5 py-4">
          <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
            답변이 끝나면 정지 버튼을 누르세요
          </p>

          {/* 파형 시각화 */}
          <div className="flex items-end gap-[3px] h-10">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="wave-bar rounded-full"
                style={{
                  width: 3,
                  height: "100%",
                  background: `rgba(239,68,68,${0.4 + (i % 3) * 0.2})`,
                  transformOrigin: "bottom",
                  "--dur": `${0.5 + (i % 7) * 0.12}s`,
                  animationDelay: `${(i * 0.05) % 0.8}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <button
            onClick={handleStop}
            aria-label="녹음 중지"
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl recording-pulse transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}
          >
            ⏹
          </button>

          {phase.interim && (
            <div
              className="w-full rounded-2xl p-4 text-sm leading-relaxed"
              style={{
                background: "rgba(10,6,24,0.7)",
                border: "1px solid rgba(109,40,217,0.2)",
                color: "rgba(196,181,253,0.8)",
                minHeight: 64,
              }}
            >
              {phase.interim}
              <span
                className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
                style={{ background: "#d97706" }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── 텍스트 확인 ── */}
      {phase.t === "transcribed" && (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(10,6,24,0.7)", border: "1px solid rgba(109,40,217,0.2)" }}
          >
            <p className="text-xs mb-2" style={{ color: "rgba(100,80,150,0.9)" }}>인식된 답변</p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(226,232,240,0.9)" }}>{phase.text}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onPhaseChange({ t: "question" })}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ border: "1px solid rgba(80,50,120,0.5)", color: "rgba(148,163,184,0.7)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(109,40,217,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(80,50,120,0.5)"; }}
            >
              다시 녹음
            </button>
            <button
              onClick={handleEvaluate}
              className="btn-shimmer flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #c026d3, #7c3aed, #4c1d95)",
                color: "#e9d5ff",
                boxShadow: "0 0 18px rgba(192,38,211,0.35), 0 0 28px rgba(124,58,237,0.25)",
              }}
            >
              ✦ 평가 받기
            </button>
          </div>
        </div>
      )}

      {/* ── 평가 중 ── */}
      {phase.t === "evaluating" && (
        <div className="flex flex-col items-center gap-5 py-10">
          <div className="relative w-14 h-14">
            <div
              className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "#7c3aed" }}
            />
            <div
              className="absolute inset-2 rounded-full border border-t-transparent animate-spin"
              style={{ borderColor: "rgba(217,119,6,0.3)", borderTopColor: "#d97706", animationDuration: "1.5s" }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-lg">✦</div>
          </div>
          <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
            운명의 카드가 당신을 평가하고 있습니다...
          </p>
        </div>
      )}

      {/* ── 평가 완료 ── */}
      {phase.t === "evaluated" && (
        <EvaluationDisplay evaluation={phase.evaluation} onClose={onClose} />
      )}
    </div>
  );
}

function EvaluationDisplay({ evaluation, onClose }: { evaluation: EvaluationResult; onClose: () => void }) {
  const pct = `${evaluation.score * 10}%`;
  const scoreGradient =
    evaluation.score >= 8
      ? "linear-gradient(90deg, #059669, #10b981)"
      : evaluation.score >= 5
        ? "linear-gradient(90deg, #d97706, #f59e0b)"
        : "linear-gradient(90deg, #dc2626, #ef4444)";
  const scoreColor = evaluation.score >= 8 ? "#6ee7b7" : evaluation.score >= 5 ? "#fde68a" : "#fca5a5";

  return (
    <div className="flex flex-col gap-5">
      {/* 점수 */}
      <div
        className="rounded-2xl p-5 fade-up"
        style={{ background: "rgba(10,6,24,0.8)", border: "1px solid rgba(109,40,217,0.2)" }}
      >
        <div className="flex items-end justify-between mb-3">
          <span className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>종합 점수</span>
          <span className="text-3xl font-bold" style={{ color: scoreColor }}>
            {evaluation.score}
            <span className="text-base font-normal ml-1" style={{ color: "rgba(100,80,140,0.8)" }}> / 10</span>
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,20,50,0.8)" }}>
          <div
            className="h-full rounded-full score-bar-fill"
            style={{ width: pct, background: scoreGradient, boxShadow: `0 0 8px ${scoreColor}50` }}
          />
        </div>
      </div>

      {/* 잘한 점 */}
      <div className="fade-up" style={{ animationDelay: "0.1s" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#6ee7b7" }}>잘한 점</p>
        <div className="flex flex-col gap-2">
          {evaluation.strengths.map((s, i) => (
            <div
              key={i}
              className="flex gap-2.5 items-start text-sm rounded-xl px-3.5 py-2.5 fade-up"
              style={{
                background: "rgba(6,78,59,0.2)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "rgba(209,250,229,0.85)",
                animationDelay: `${0.15 + i * 0.08}s`,
              }}
            >
              <span className="shrink-0 mt-px" style={{ color: "#34d399" }}>✓</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 개선할 점 */}
      <div className="fade-up" style={{ animationDelay: "0.25s" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#fbbf24" }}>개선할 점</p>
        <div className="flex flex-col gap-2">
          {evaluation.improvements.map((imp, i) => (
            <div
              key={i}
              className="flex gap-2.5 items-start text-sm rounded-xl px-3.5 py-2.5 fade-up"
              style={{
                background: "rgba(120,53,15,0.2)",
                border: "1px solid rgba(217,119,6,0.2)",
                color: "rgba(254,243,199,0.85)",
                animationDelay: `${0.3 + i * 0.08}s`,
              }}
            >
              <span className="shrink-0 mt-px" style={{ color: "#f59e0b" }}>→</span>
              <span>{imp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 총평 */}
      <div
        className="rounded-2xl p-4 fade-up"
        style={{
          background: "rgba(55,14,120,0.2)",
          border: "1px solid rgba(109,40,217,0.25)",
          animationDelay: "0.4s",
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a78bfa" }}>총평</p>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(221,214,254,0.85)" }}>{evaluation.summary}</p>
      </div>

      {/* 닫기 */}
      <button
        onClick={onClose}
        className="btn-shimmer w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] fade-up"
        style={{
          border: "1px solid rgba(109,40,217,0.35)",
          color: "rgba(167,139,250,0.8)",
          background: "rgba(109,40,217,0.06)",
          animationDelay: "0.5s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(109,40,217,0.14)";
          (e.currentTarget as HTMLElement).style.color = "rgba(196,181,253,1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(109,40,217,0.06)";
          (e.currentTarget as HTMLElement).style.color = "rgba(167,139,250,0.8)";
        }}
      >
        다른 카드 선택하기  →
      </button>
    </div>
  );
}
