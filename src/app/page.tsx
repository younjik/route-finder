"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
          font-family: var(--font-display);
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
      keywords: ["직무 연관성", "구체적 사례", "성과"],
      hint: {
        keywords: ["직무 연관성", "구체적 사례", "성과"],
        star: {
          situation:
            "핵심 역량을 발휘했던 프로젝트나 업무 상황을 먼저 소개하세요.",
          task: "그 역량이 필요했던 이유와 맡았던 역할을 설명하세요.",
          action: "역량을 어떻게 구체적으로 활용했는지 행동 위주로 말하세요.",
          result: "그 결과 얻은 성과와 이 직무에 어떻게 연결되는지 정리하세요.",
        },
        sampleAnswer:
          "저는 데이터 기반으로 문제를 정의하고 해결하는 역량이 강점입니다. 이전 프로젝트에서 사용자 이탈 원인을 분석해 온보딩 플로우를 개선했고, 그 결과 이탈률을 15% 줄였습니다. 이 직무에서도 데이터로 의사결정을 뒷받침하는 데 기여하고 싶습니다.",
      },
    },
    {
      id: 1,
      arcana: "The High Priestess",
      arcanaKo: "여사제",
      category: "문제해결",
      difficulty: "normal",
      question: "업무 중 예상치 못한 문제가 발생했을 때 어떻게 대처했나요?",
      keywords: ["원인 분석", "우선순위", "대안 마련"],
      hint: {
        keywords: ["원인 분석", "우선순위", "대안 마련"],
        star: {
          situation: "문제가 발생한 배경과 상황의 긴급성을 설명하세요.",
          task: "문제 해결을 위해 본인이 맡았던 역할을 명확히 하세요.",
          action:
            "원인을 어떻게 분석했고 어떤 대안을 실행했는지 구체적으로 말하세요.",
          result:
            "문제가 어떻게 해결됐고 이후 재발 방지를 위해 무엇을 했는지 말하세요.",
        },
        sampleAnswer:
          "배포 직후 서버 응답 지연이 발생했을 때, 먼저 모니터링 지표로 원인을 좁히고 임시로 캐시를 늘려 긴급 대응했습니다. 이후 근본 원인인 쿼리 병목을 찾아 인덱스를 추가해 재발을 막았습니다.",
      },
    },
    {
      id: 2,
      arcana: "The Empress",
      arcanaKo: "여황제",
      category: "협업",
      difficulty: "normal",
      question: "팀원과 의견이 충돌했던 경험과 어떻게 해결했는지 말해주세요.",
      keywords: ["경청", "합의점", "커뮤니케이션"],
      hint: {
        keywords: ["경청", "합의점", "커뮤니케이션"],
        star: {
          situation:
            "의견 충돌이 있었던 구체적 상황(프로젝트, 안건)을 설명하세요.",
          task: "본인이 이 상황에서 어떤 입장·역할이었는지 말하세요.",
          action:
            "상대 의견을 어떻게 경청했고 합의점을 어떻게 이끌어냈는지 설명하세요.",
          result:
            "갈등이 어떻게 해소됐고 팀에 어떤 긍정적 영향을 줬는지 말하세요.",
        },
        sampleAnswer:
          "디자인 방향을 두고 팀원과 의견이 갈렸을 때, 각자의 근거를 데이터로 정리해 비교했습니다. 사용자 테스트를 제안해 실제 반응을 근거로 합의했고, 결과적으로 팀의 의사결정 방식 자체가 더 데이터 중심으로 개선됐습니다.",
      },
    },
    {
      id: 3,
      arcana: "The Emperor",
      arcanaKo: "황제",
      category: "리더십",
      difficulty: "advanced",
      question:
        "프로젝트를 이끌면서 가장 어려웠던 순간과 그것을 극복한 방법은?",
      keywords: ["의사결정", "책임감", "팀 동기부여"],
      hint: {
        keywords: ["의사결정", "책임감", "팀 동기부여"],
        star: {
          situation:
            "리더로서 맡았던 프로젝트의 목표와 어려웠던 상황을 설명하세요.",
          task: "리더로서 본인이 책임져야 했던 부분을 구체적으로 말하세요.",
          action: "어떤 의사결정을 내렸고 팀을 어떻게 이끌었는지 설명하세요.",
          result: "프로젝트 결과와 리더십 경험을 통해 배운 점을 말하세요.",
        },
        sampleAnswer:
          "일정이 촉박한 프로젝트에서 팀원들의 사기가 떨어졌을 때, 작업을 재분배하고 매일 짧은 체크인으로 진행 상황을 공유했습니다. 결과적으로 마감을 지켰고, 팀원들과의 신뢰도 더 단단해졌습니다.",
      },
    },
    {
      id: 4,
      arcana: "The Hierophant",
      arcanaKo: "교황",
      category: "가치관",
      difficulty: "normal",
      question: "회사를 선택할 때 가장 중요하게 생각하는 기준은 무엇인가요?",
      keywords: ["가치관", "적합성", "장기적 성장"],
      hint: {
        keywords: ["가치관", "적합성", "장기적 성장"],
        star: {
          situation: "이전에 회사·직무를 선택했던 실제 경험을 언급하세요.",
          task: "그 선택에서 본인이 중요하게 여긴 기준이 무엇이었는지 짚으세요.",
          action: "그 기준을 바탕으로 어떻게 판단하고 결정했는지 설명하세요.",
          result:
            "그 선택이 어떤 성장·만족으로 이어졌는지, 지금 지원 회사와 어떻게 연결되는지 말하세요.",
        },
        sampleAnswer:
          "저는 실무에서 배우고 성장할 수 있는 환경을 가장 중요하게 봅니다. 이전 회사도 신입에게 실제 프로젝트를 맡기는 문화를 보고 선택했고, 그 결과 짧은 기간에 많은 실무 역량을 쌓을 수 있었습니다.",
      },
    },
    {
      id: 5,
      arcana: "The Lovers",
      arcanaKo: "연인",
      category: "의사결정",
      difficulty: "normal",
      question: "여러 선택지 앞에서 결정을 내리는 본인만의 방법이 있나요?",
      keywords: ["기준 설정", "정보 수집", "트레이드오프"],
      hint: {
        keywords: ["기준 설정", "정보 수집", "트레이드오프"],
        star: {
          situation: "여러 선택지를 두고 고민했던 구체적 상황을 소개하세요.",
          task: "결정을 내려야 했던 이유와 기한 등 제약을 설명하세요.",
          action: "어떤 기준으로 정보를 모으고 비교했는지 구체적으로 말하세요.",
          result:
            "최종 결정과 그 결과, 그리고 이 방법이 왜 효과적이었는지 말하세요.",
        },
        sampleAnswer:
          "기술 스택을 선택할 때는 성능, 학습 곡선, 팀 숙련도를 기준으로 표를 만들어 비교합니다. 최근에도 이 방식으로 라이브러리를 선정해 팀 전체의 적응 시간을 줄일 수 있었습니다.",
      },
    },
    {
      id: 6,
      arcana: "The Chariot",
      arcanaKo: "전차",
      category: "목표달성",
      difficulty: "advanced",
      question:
        "설정한 목표를 달성하기 위해 특별히 노력했던 경험을 들려주세요.",
      keywords: ["목표 설정", "실행력", "성과 측정"],
      hint: {
        keywords: ["목표 설정", "실행력", "성과 측정"],
        star: {
          situation: "달성하고자 했던 구체적 목표와 배경을 설명하세요.",
          task: "목표를 위해 본인이 맡았던 역할과 계획을 말하세요.",
          action: "목표 달성을 위해 실제로 실행한 구체적 행동을 설명하세요.",
          result:
            "수치로 확인할 수 있는 결과와 그 과정에서 배운 점을 말하세요.",
        },
        sampleAnswer:
          "분기 내 신규 가입자 20% 증가라는 목표를 세우고, 온보딩 퍼널을 단계별로 분석해 이탈 지점을 개선했습니다. 그 결과 목표를 초과 달성해 25% 증가를 이뤄냈습니다.",
      },
    },
    {
      id: 7,
      arcana: "Strength",
      arcanaKo: "힘",
      category: "위기극복",
      difficulty: "normal",
      question: "극심한 스트레스나 압박을 받았을 때 어떻게 대처하나요?",
      keywords: ["스트레스 관리", "우선순위 조정", "침착함"],
      hint: {
        keywords: ["스트레스 관리", "우선순위 조정", "침착함"],
        star: {
          situation: "압박이 심했던 구체적 상황(마감, 장애 등)을 설명하세요.",
          task: "그 상황에서 본인이 처리해야 했던 업무를 말하세요.",
          action:
            "스트레스 속에서도 어떻게 우선순위를 정하고 침착하게 대응했는지 설명하세요.",
          result:
            "상황이 어떻게 마무리됐고, 이후 스트레스 관리 방식이 어떻게 달라졌는지 말하세요.",
        },
        sampleAnswer:
          "출시 하루 전 치명적 버그를 발견했을 때, 먼저 영향 범위를 파악해 우선순위를 정하고 팀에 상황을 투명하게 공유했습니다. 밤샘 작업 끝에 일정 내 수정을 마쳤고, 이후로는 배포 전 체크리스트를 만들어 재발을 막았습니다.",
      },
    },
    {
      id: 8,
      arcana: "The Hermit",
      arcanaKo: "은둔자",
      category: "자기계발",
      difficulty: "normal",
      question:
        "최근 스스로 새롭게 배우거나 성장한 경험이 있다면 소개해주세요.",
      keywords: ["자기주도 학습", "적용 사례", "지속적 성장"],
      hint: {
        keywords: ["자기주도 학습", "적용 사례", "지속적 성장"],
        star: {
          situation: "새로운 것을 배우게 된 계기를 설명하세요.",
          task: "무엇을, 왜 배우기로 했는지 목표를 말하세요.",
          action:
            "구체적으로 어떻게 학습하고 실제 업무에 적용했는지 설명하세요.",
          result:
            "학습 결과와 그것이 본인의 성장에 어떤 영향을 줬는지 말하세요.",
        },
        sampleAnswer:
          "성능 최적화에 약점을 느껴 최근 3개월간 웹 성능 관련 강의와 문서를 학습했습니다. 배운 내용을 실제 프로젝트에 적용해 초기 로딩 시간을 30% 줄였고, 이제는 팀 내에서 관련 리뷰도 맡고 있습니다.",
      },
    },
    {
      id: 9,
      arcana: "Wheel of Fortune",
      arcanaKo: "운명의 수레바퀴",
      category: "적응력",
      difficulty: "advanced",
      question:
        "빠르게 변화하는 환경에서 본인이 어떻게 적응해 왔는지 말해주세요.",
      keywords: ["변화 수용", "빠른 학습", "유연한 대응"],
      hint: {
        keywords: ["변화 수용", "빠른 학습", "유연한 대응"],
        star: {
          situation:
            "예상치 못한 변화(조직 개편, 기술 전환 등)를 겪었던 상황을 설명하세요.",
          task: "그 변화 속에서 본인이 맡았던 과제나 목표를 말하세요.",
          action:
            "변화에 적응하기 위해 구체적으로 어떤 노력을 했는지 설명하세요.",
          result: "적응 결과와 그 경험에서 얻은 교훈을 말하세요.",
        },
        sampleAnswer:
          "팀이 갑자기 새로운 프레임워크로 전환했을 때, 공식 문서를 빠르게 학습하고 작은 기능부터 직접 구현해보며 적응했습니다. 두 달 만에 팀 내 마이그레이션을 리드할 정도로 익숙해졌고, 변화 자체를 성장 기회로 보는 태도를 갖게 됐습니다.",
      },
    },
  ],
} as const;

export default function UploadPage() {
  const router = useRouter();
  const [resume, setResume] = useState<File | null>(null);
  const [job, setJob] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = resume && job && !loading;

  function handleDemo() {
    sessionStorage.setItem("interview:generate", JSON.stringify(DEMO_DATA));
    sessionStorage.removeItem("interview:answers");
    router.push("/cards");
  }

  async function handleGenerate() {
    if (!resume || !job) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("resume", resume);
      fd.append("job", job);
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
      <header className="hero">
        <div className="eyebrow">ARCANA · INTERVIEW</div>
        <h1 className="serif title">
          당신의 면접은
          <br />
          이미 카드에 적혀 있다
        </h1>
        <p className="lede">
          자소서와 채용공고를 펼쳐 두면, 그 안에서 운명의 면접 질문 열 장을
          뽑아냅니다. 카드를 뒤집고, 목소리로 답하고, 평가를 받으세요.
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

      <button className="cta" disabled={!ready} onClick={handleGenerate}>
        {loading ? (
          <span className="loading-text">카드를 펼치는 중…</span>
        ) : (
          "질문 생성하기"
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
      `}</style>
    </main>
  );
}
