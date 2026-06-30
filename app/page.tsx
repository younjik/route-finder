"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import CrystalField from "@/components/CrystalField";
import { QuestionResult } from "@/lib/claude";

const RESUME_ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
const JOB_ACCEPT = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

const DEMO_DATA: QuestionResult = {
  keywords: ["React", "TypeScript", "협업", "문제해결", "커뮤니케이션", "성장", "애자일", "코드리뷰"],
  questions: {
    인성: [
      "팀 프로젝트에서 의견 충돌이 생겼을 때 어떻게 해결하셨나요?",
      "가장 힘들었던 순간과 그것을 어떻게 극복했는지 말씀해주세요.",
      "5년 후 본인의 모습을 어떻게 그리고 있나요?",
    ],
    기술_직무: [
      "React의 렌더링 최적화를 위해 어떤 방법을 사용해보셨나요?",
      "TypeScript를 사용하면서 가장 도움이 됐던 기능은 무엇인가요?",
      "코드 리뷰 시 가장 중요하게 보는 기준이 무엇인가요?",
      "REST API와 GraphQL의 차이점과 각각 어떤 상황에 사용하면 좋은지 설명해주세요.",
    ],
    경험: [
      "지금까지 진행한 프로젝트 중 가장 자랑스러운 것을 소개해주세요.",
      "개발 중 예상치 못한 버그를 해결했던 경험을 말씀해주세요.",
      "협업 도구나 개발 문화를 개선한 경험이 있으신가요?",
    ],
  },
};

/* SSR/클라이언트 부동소수점 오차 방지용 반올림 */
const r2 = (n: number) => Math.round(n * 100) / 100;

/* 배경에 떠오르는 파티클 */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 5.5 + 3) % 94}%`,
  size: [1.5, 2, 2.5, 1][i % 4],
  delay: `${(i * 0.6) % 9}s`,
  duration: `${7 + (i * 1.1) % 7}s`,
  color: i % 4 === 0 ? "rgba(196,181,253,0.5)" : i % 4 === 1 ? "rgba(253,230,138,0.4)" : i % 4 === 2 ? "rgba(167,139,250,0.35)" : "rgba(244,114,235,0.4)",
}));

export default function Home() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = resumeFile && jobFile && !loading;

  const handleGenerate = async () => {
    if (!resumeFile || !jobFile) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("resume", resumeFile);
      fd.append("job", jobFile);
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "서버 오류");
      sessionStorage.setItem("interviewData", JSON.stringify(data.result));
      router.push("/cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setLoading(false);
    }
  };

  const handleDemo = () => {
    sessionStorage.setItem("interviewData", JSON.stringify(DEMO_DATA));
    router.push("/cards");
  };

  return (
    <main className="min-h-screen tarot-bg relative overflow-hidden">
      <div className="stars-layer" aria-hidden="true" />

      {/* 파티클 */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left,
              bottom: "-10px",
              width: p.size,
              height: p.size,
              background: p.color,
              animation: `particle-rise ${p.duration} ${p.delay} infinite linear`,
            }}
          />
        ))}
      </div>

      {/* 크리스탈 조각 장식 */}
      <CrystalField />

      <div className="relative z-10 max-w-xl mx-auto px-4 py-14">

        {/* ── 헤더 ── */}
        <div className="text-center mb-12">
          {/* 크리스탈 오브 */}
          <div className="orb-container mb-10">
            {/* 점성술 원형 문양 */}
            <svg className="zodiac-ring" viewBox="0 0 280 280" aria-hidden="true">
              <circle cx="140" cy="140" r="128" fill="none" stroke="rgba(217,119,6,0.55)" strokeWidth="1" />
              <circle cx="140" cy="140" r="112" fill="none" stroke="rgba(236,72,153,0.4)" strokeWidth="0.6" strokeDasharray="2 5" />
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                const isMajor = i % 3 === 0;
                const inner = isMajor ? 112 : 120;
                return (
                  <line key={i}
                    x1={r2(140 + inner * Math.cos(a))} y1={r2(140 + inner * Math.sin(a))}
                    x2={r2(140 + 128 * Math.cos(a))} y2={r2(140 + 128 * Math.sin(a))}
                    stroke={isMajor ? "rgba(217,119,6,0.7)" : "rgba(217,119,6,0.35)"}
                    strokeWidth={isMajor ? "1.2" : "0.6"}
                  />
                );
              })}
              {[0, 90, 180, 270].map((deg, i) => {
                const a = (deg * Math.PI) / 180;
                return (
                  <text key={i} x={r2(140 + 128 * Math.cos(a))} y={r2(140 + 128 * Math.sin(a) + 4)}
                    fill="rgba(236,72,153,0.7)" fontSize="11" textAnchor="middle">✦</text>
                );
              })}
            </svg>
            <svg className="zodiac-ring-inner" viewBox="0 0 184 184" aria-hidden="true">
              <circle cx="92" cy="92" r="84" fill="none" stroke="rgba(236,72,153,0.3)" strokeWidth="0.7" strokeDasharray="1 6" />
            </svg>

            <div className="orb-ring orb-ring-1" />
            <div className="orb-ring orb-ring-2" />
            <div className="orb-ring orb-ring-3" />
            <div className="orb-body">
              <div className="orb-highlight" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-4xl select-none">
              🔮
            </div>
          </div>

          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ color: "rgba(180,83,9,0.7)" }}
          >
            Interview Tarot
          </p>
          <h1 className="gradient-title text-4xl font-bold tracking-tight mb-4">
            면접 타로
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(148,163,184,0.8)" }}>
            자소서와 채용공고를 올리면<br />
            <span style={{ color: "rgba(232,121,249,0.8)" }}>운명의 카드</span>가 당신의 면접을 이끕니다
          </p>
        </div>

        {/* ── 업로드 패널 ── */}
        <div
          className="rounded-2xl p-7 mb-4 upload-glow"
          style={{
            background: "rgba(15,9,36,0.7)",
            border: "1px solid rgba(109,40,217,0.3)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* 구분선 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(180,83,9,0.4))" }} />
            <span className="text-xs tracking-widest" style={{ color: "rgba(180,83,9,0.6)" }}>DOCUMENTS</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(180,83,9,0.4))" }} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileUpload label="자소서" accept={RESUME_ACCEPT} file={resumeFile} onFile={setResumeFile} hint="PDF, DOCX" />
            <FileUpload label="채용공고" accept={JOB_ACCEPT} file={jobFile} onFile={setJobFile} hint="PDF, PNG, JPG" />
          </div>

          {error && (
            <div
              className="mt-5 p-3 rounded-xl text-sm"
              style={{ background: "rgba(127,29,29,0.4)", border: "1px solid rgba(185,28,28,0.3)", color: "#fca5a5" }}
            >
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="btn-shimmer w-full py-4 rounded-xl font-bold text-sm tracking-widest transition-all duration-200 active:scale-[0.97]"
              style={canSubmit ? {
                background: "linear-gradient(135deg, #b45309 0%, #92400e 50%, #78350f 100%)",
                color: "#fef3c7",
                boxShadow: "0 0 22px rgba(180,83,9,0.4), 0 0 34px rgba(217,70,239,0.2), 0 4px 20px rgba(0,0,0,0.4)",
              } : {
                background: "rgba(30,20,50,0.5)",
                color: "rgba(100,80,140,0.5)",
                border: "1px solid rgba(80,40,120,0.2)",
                cursor: "not-allowed",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "rgba(253,230,138,0.6)", borderTopColor: "transparent" }}
                  />
                  카드를 읽는 중...
                </span>
              ) : (
                "✦  운명의 카드 뽑기  ✦"
              )}
            </button>
          </div>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5 px-2">
          <div className="flex-1 h-px" style={{ background: "rgba(55,30,90,0.6)" }} />
          <span className="text-xs" style={{ color: "rgba(80,60,110,0.8)" }}>또는</span>
          <div className="flex-1 h-px" style={{ background: "rgba(55,30,90,0.6)" }} />
        </div>

        {/* 데모 버튼 */}
        <button
          onClick={handleDemo}
          className="w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97]"
          style={{
            border: "1px solid rgba(109,40,217,0.35)",
            color: "rgba(167,139,250,0.8)",
            background: "rgba(109,40,217,0.05)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(109,40,217,0.12)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.5)";
            (e.currentTarget as HTMLElement).style.color = "rgba(196,181,253,0.95)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(109,40,217,0.05)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(109,40,217,0.35)";
            (e.currentTarget as HTMLElement).style.color = "rgba(167,139,250,0.8)";
          }}
        >
          샘플 데이터로 미리 체험하기  →
        </button>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(60,40,90,0.9)" }}>
          업로드한 파일은 서버에 저장되지 않습니다
        </p>
      </div>
    </main>
  );
}
