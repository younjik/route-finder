"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TarotCard from "@/components/TarotCard";
import AnswerDrawer, { DrawerPhase } from "@/components/AnswerDrawer";
import CrystalField from "@/components/CrystalField";
import { InterviewQuestion, QuestionResult, EvaluationResult } from "@/lib/claude";

const ROTATIONS = [-3.5, 2, -1.5, 2.5, -0.5, 1.5, -2.5, 1, -1, 3];

function flattenQuestions(qs: QuestionResult["questions"]): InterviewQuestion[] {
  const result: InterviewQuestion[] = [];
  let id = 0;
  (["인성", "기술_직무", "경험"] as const).forEach((cat) => {
    (qs[cat] ?? []).forEach((q) => result.push({ id: id++, category: cat, question: q }));
  });
  return result;
}

type AnswerRecord = { transcript: string; evaluation: EvaluationResult };

export default function CardsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});
  const [drawerPhase, setDrawerPhase] = useState<DrawerPhase>({ t: "question" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("interviewData");
    if (!raw) { router.push("/"); return; }
    try {
      const data: QuestionResult = JSON.parse(raw);
      setQuestions(flattenQuestions(data.questions));
      setKeywords(data.keywords ?? []);
      setTimeout(() => setMounted(true), 50);
    } catch {
      router.push("/");
    }
  }, [router]);

  const selectedQuestion = questions.find((q) => q.id === selectedId) ?? null;
  const doneCount = Object.keys(answers).length;

  const openCard = (q: InterviewQuestion) => {
    setFlippedIds((prev) => new Set(prev).add(q.id));
    setSelectedId(q.id);
    if (answers[q.id]) {
      setDrawerPhase({ t: "evaluated", text: answers[q.id].transcript, evaluation: answers[q.id].evaluation });
    } else {
      setDrawerPhase({ t: "question" });
    }
  };

  const closeDrawer = () => setSelectedId(null);

  const handleAnswerSaved = (transcript: string, evaluation: EvaluationResult) => {
    if (selectedId === null) return;
    setAnswers((prev) => ({ ...prev, [selectedId]: { transcript, evaluation } }));
  };

  return (
    <div className="min-h-screen tarot-bg relative overflow-x-hidden">
      <div className="stars-layer" aria-hidden="true" />

      {/* 배경 네뷸라 */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 18%, rgba(236,72,153,0.13) 0%, transparent 64%), radial-gradient(ellipse 70% 50% at 50% 60%, rgba(124,30,140,0.10) 0%, transparent 70%)",
        }}
      />

      {/* 크리스탈 조각 장식 */}
      <CrystalField />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

        {/* ── 헤더 ── */}
        <div className="text-center mb-10">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{ color: "rgba(180,83,9,0.7)" }}
          >
            Interview Tarot
          </p>

          <h1
            className="gradient-title text-3xl font-bold tracking-wide mb-1"
          >
            ✦ 카드를 선택하세요 ✦
          </h1>

          {/* 진행 상태 */}
          <p className="text-sm mt-2" style={{ color: "rgba(100,80,150,0.9)" }}>
            {doneCount} / {questions.length} 완료
          </p>

          {/* 진행 바 */}
          {questions.length > 0 && (
            <div
              className="mt-3 mx-auto max-w-[200px] h-[3px] rounded-full overflow-hidden"
              style={{ background: "rgba(40,20,70,0.8)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${questions.length > 0 ? (doneCount / questions.length) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #7c3aed, #d946ef, #d97706)",
                  boxShadow: "0 0 8px rgba(217,70,239,0.5)",
                }}
              />
            </div>
          )}

          {/* 키워드 */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {keywords.map((kw, i) => (
                <span
                  key={kw}
                  className="px-2.5 py-0.5 rounded-full text-xs fade-up"
                  style={{
                    background: "rgba(55,20,100,0.4)",
                    border: "1px solid rgba(109,40,217,0.3)",
                    color: "rgba(196,181,253,0.8)",
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 카드 스프레드 ── */}
        {questions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-24" style={{ color: "rgba(80,50,130,0.8)" }}>
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "rgba(109,40,217,0.4)", borderTopColor: "transparent" }}
            />
            <p className="text-sm">카드를 불러오는 중...</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5 px-2">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={mounted ? "card-enter" : "opacity-0"}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <TarotCard
                  question={q}
                  isFlipped={flippedIds.has(q.id)}
                  isDone={!!answers[q.id]}
                  rotation={ROTATIONS[i % ROTATIONS.length]}
                  onClick={() => openCard(q)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 전체 완료 */}
        {doneCount > 0 && doneCount === questions.length && (
          <div className="text-center mt-12 fade-up">
            <p
              className="text-sm font-medium mb-4"
              style={{ color: "rgba(253,230,138,0.7)" }}
            >
              ✦ 모든 카드를 완료했습니다 ✦
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                border: "1px solid rgba(180,83,9,0.4)",
                color: "rgba(217,119,6,0.8)",
                background: "rgba(180,83,9,0.05)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(180,83,9,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(180,83,9,0.05)";
              }}
            >
              처음으로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* ── 드로어 ── */}
      {selectedId !== null && selectedQuestion && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end">
          <div
            className="absolute inset-0 backdrop-blur-[3px]"
            style={{ background: "rgba(4,2,12,0.75)" }}
            onClick={closeDrawer}
          />
          <div
            className="relative z-30 rounded-t-3xl overflow-y-auto"
            style={{
              background: "linear-gradient(170deg, #0d0922 0%, #080614 100%)",
              borderTop: "1px solid rgba(109,40,217,0.4)",
              maxHeight: "84vh",
              boxShadow: "0 -30px 80px rgba(0,0,0,0.8), 0 -1px 0 rgba(167,139,250,0.1)",
            }}
          >
            {/* 상단 글로우 라인 */}
            <div
              className="absolute top-0 left-1/4 right-1/4 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }}
            />
            <AnswerDrawer
              question={selectedQuestion}
              phase={drawerPhase}
              error={null}
              onPhaseChange={setDrawerPhase}
              onAnswerSaved={handleAnswerSaved}
              onClose={closeDrawer}
            />
          </div>
        </div>
      )}
    </div>
  );
}
