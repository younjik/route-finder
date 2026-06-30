"use client";

import { QuestionResult } from "@/lib/claude";

interface Props {
  result: QuestionResult;
}

const CATEGORY_CONFIG = [
  {
    key: "인성" as const,
    label: "인성",
    color: "bg-purple-100 text-purple-800",
    border: "border-purple-200",
    badge: "bg-purple-500",
    number: "text-purple-500",
  },
  {
    key: "기술_직무" as const,
    label: "기술 / 직무",
    color: "bg-blue-100 text-blue-800",
    border: "border-blue-200",
    badge: "bg-blue-500",
    number: "text-blue-500",
  },
  {
    key: "경험" as const,
    label: "경험",
    color: "bg-green-100 text-green-800",
    border: "border-green-200",
    badge: "bg-green-500",
    number: "text-green-500",
  },
];

export default function QuestionList({ result }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* 키워드 */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">핵심 키워드</h2>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* 질문 카테고리별 */}
      <div className="grid gap-6 md:grid-cols-3">
        {CATEGORY_CONFIG.map(({ key, label, color, border, number }) => (
          <div key={key} className={`rounded-xl border ${border} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>
                {label}
              </span>
              <span className="text-xs text-gray-400">
                {result.questions[key]?.length ?? 0}개
              </span>
            </div>
            <ol className="flex flex-col gap-3">
              {(result.questions[key] ?? []).map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                  <span className={`font-bold shrink-0 ${number}`}>{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
