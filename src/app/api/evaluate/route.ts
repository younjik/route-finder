import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Evaluation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { question, transcript } = await req.json();

    if (!question || !transcript) {
      return NextResponse.json(
        { error: "질문과 답변 텍스트가 필요합니다." },
        { status: 400 }
      );
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content:
            "당신은 경험 많은 채용 면접관입니다. 아래 면접 질문에 대한 지원자의 음성 답변(STT 변환 텍스트)을 평가하세요. " +
            "변환 과정의 사소한 오탈자나 띄어쓰기는 감안하고, 내용과 구조, 구체성, 직무 적합성을 중심으로 채점하세요.\n\n" +
            `[면접 질문]\n${question}\n\n` +
            `[지원자 답변]\n${transcript}\n\n` +
            "반드시 아래 JSON 형식으로만 응답하세요. 코드펜스나 설명 없이 JSON 객체 하나만 출력합니다.\n" +
            `{
  "score": 7,                         // 1~10 정수
  "strengths": ["잘한 점1", "잘한 점2"],     // 2~3개, 구체적으로
  "improvements": ["개선점1", "개선점2"],    // 2~3개, 실행 가능한 조언
  "summary": "한두 문장 총평"
}`,
        },
      ],
    });

    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("평가 응답 파싱 실패");
      parsed = JSON.parse(m[0]);
    }

    const evaluation: Evaluation = {
      score: Math.max(1, Math.min(10, Math.round(parsed.score ?? 5))),
      strengths: parsed.strengths ?? [],
      improvements: parsed.improvements ?? [],
      summary: parsed.summary ?? "",
    };

    return NextResponse.json(evaluation);
  } catch (err: any) {
    console.error("[/api/evaluate]", err);
    return NextResponse.json(
      { error: err?.message ?? "평가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
