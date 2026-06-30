import { NextRequest, NextResponse } from "next/server";
import { anthropic, EvaluationResult } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const CATEGORY_LABEL: Record<string, string> = {
  인성: "인성",
  기술_직무: "기술/직무",
  경험: "경험",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, answer, category } = body;

    if (!question || !answer || !category) {
      return NextResponse.json(
        { error: "question, answer, category는 필수입니다." },
        { status: 400 }
      );
    }

    if (typeof answer !== "string" || answer.trim().length < 5) {
      return NextResponse.json(
        { error: "답변이 너무 짧습니다." },
        { status: 400 }
      );
    }

    // 과도하게 긴 입력 차단
    if (answer.length > 5000) {
      return NextResponse.json(
        { error: "답변이 너무 깁니다 (최대 5000자)." },
        { status: 400 }
      );
    }

    const categoryName = CATEGORY_LABEL[category] ?? category;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `당신은 경험 많은 면접관입니다. 아래 면접 답변을 냉정하고 건설적으로 평가해주세요.

카테고리: ${categoryName}
질문: ${question}
답변: ${answer.trim()}

반드시 아래 JSON 형식으로만 응답하세요 (코드블록 없이 순수 JSON):
{
  "score": 7,
  "strengths": ["잘한 점 1문장", "잘한 점 1문장"],
  "improvements": ["개선할 점 1문장", "개선할 점 1문장"],
  "summary": "전반적인 총평 2~3문장"
}

점수 기준: 1~3 많은 개선 필요 / 4~6 보통 / 7~8 좋음 / 9~10 매우 우수`,
        },
      ],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("평가 결과 파싱 실패");

    const evaluation: EvaluationResult = JSON.parse(match[0]);
    return NextResponse.json({ evaluation });
  } catch (err) {
    console.error("[/api/evaluate]", err);
    const message = err instanceof Error ? err.message : "평가 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
