import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseUpload } from "@/lib/parse";
import { ARCANA } from "@/lib/arcana";
import type { GenerateResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const resumeFile = form.get("resume") as File | null;
    const jobFile = form.get("job") as File | null;

    if (!resumeFile || !jobFile) {
      return NextResponse.json(
        { error: "자소서와 채용공고를 모두 업로드해 주세요." },
        { status: 400 }
      );
    }

    // 키가 없으면 데모 모드: 파일 파싱/Claude 호출 없이 목업 질문 10개 반환
    // (실제 API를 연결하지 않고 UI 흐름을 확인하기 위한 용도)
    if (!process.env.ANTHROPIC_API_KEY) {
      const demoCategories = [
        "직무역량", "문제해결", "협업", "리더십", "조직적합성",
        "우선순위", "목표달성", "위기극복", "자기성찰", "변화적응",
      ];
      // 10장 중 5장을 무작위로 심화 질문으로 지정
      const advancedIds = new Set(
        [...Array(10).keys()].sort(() => Math.random() - 0.5).slice(0, 5)
      );
      const result: GenerateResult = {
        keywords: ["데모모드", "직무이해", "커뮤니케이션", "성장경험", "문제해결", "팀워크", "주도성"],
        questions: ARCANA.map((arc, i) => ({
          id: i,
          arcana: arc.name,
          arcanaKo: arc.nameKo,
          category: demoCategories[i] ?? "면접",
          difficulty: advancedIds.has(i) ? "advanced" : "normal",
          question:
            `[데모 질문 ${i + 1}] ${arc.nameKo} — ${arc.hint}에 관한 질문입니다. ` +
            `본인의 경험 중 '${arc.hint}'을(를) 가장 잘 보여줄 수 있는 사례를 구체적으로 설명해 주세요. ` +
            `(실제 키 연결 시 자소서·채용공고 기반 맞춤 질문으로 대체됩니다.)`,
        })),
      };
      return NextResponse.json(result);
    }

    const resume = await parseUpload(resumeFile);
    const job = await parseUpload(jobFile);

    // Claude 메시지 content 구성 (텍스트 + 이미지 혼합 지원)
    const content: Anthropic.MessageParam["content"] = [];

    content.push({
      type: "text",
      text:
        "당신은 한국 기업의 채용 면접관입니다. 아래의 [자소서]와 [채용공고]를 분석해 " +
        "핵심 키워드를 추출하고, 실제 면접에서 나올 법한 한국어 예상 면접 질문 10개를 만드세요.\n\n" +
        "각 질문은 서로 다른 영역을 다루도록 하세요(직무역량, 경험, 인성, 조직적합성, 문제해결, 동기 등). " +
        "지원자의 자소서 내용과 채용공고의 직무 요건을 구체적으로 반영해, 두루뭉술하지 않고 날카로운 질문을 만드세요.",
    });

    content.push({ type: "text", text: "\n[자소서]\n" });
    if (resume.text.trim()) {
      content.push({ type: "text", text: resume.text.slice(0, 12000) });
    } else if (resume.imageBase64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: resume.mediaType as any, data: resume.imageBase64 },
      });
    }

    content.push({ type: "text", text: "\n[채용공고]\n" });
    if (job.text.trim()) {
      content.push({ type: "text", text: job.text.slice(0, 12000) });
    } else if (job.imageBase64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: job.mediaType as any, data: job.imageBase64 },
      });
    }

    const arcanaList = ARCANA.map((a, i) => `${i}: ${a.nameKo}(${a.name}) — ${a.hint}`).join("\n");

    content.push({
      type: "text",
      text:
        "\n\n반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드펜스나 다른 설명 없이 JSON 객체 하나만 출력합니다.\n" +
        "10개의 질문은 아래 10장의 타로 카드 순서(index 0~9)에 1:1로 매핑하세요. 카드 테마와 질문 성격을 최대한 어울리게 배치하세요.\n" +
        "10개 중 정확히 5개는 difficulty를 \"advanced\"로, 나머지 5개는 \"normal\"로 설정하세요. " +
        "\"advanced\" 질문은 지원자의 자소서·공고를 깊이 파고드는 날카로운 심화 질문으로 만드세요.\n\n" +
        `타로 카드:\n${arcanaList}\n\n` +
        `{
  "keywords": ["키워드1", "키워드2", ...],   // 6~10개
  "questions": [
    {
      "id": 0,                    // 카드 index와 동일 (0~9)
      "category": "직무역량",      // 질문 영역
      "difficulty": "normal",     // "normal" 또는 "advanced" (전체 10개 중 5개가 advanced)
      "question": "..."           // 한국어 면접 질문 (구체적으로)
    }
    // ... 총 10개, id 0부터 9까지
  ]
}`,
    });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content }],
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
      if (!m) throw new Error("Claude 응답 파싱 실패");
      parsed = JSON.parse(m[0]);
    }

    const result: GenerateResult = {
      keywords: parsed.keywords ?? [],
      questions: (parsed.questions ?? []).slice(0, 10).map((q: any, i: number) => {
        const arc = ARCANA[q.id ?? i] ?? ARCANA[i];
        return {
          id: q.id ?? i,
          arcana: arc.name,
          arcanaKo: arc.nameKo,
          category: q.category ?? "면접",
          difficulty: q.difficulty === "advanced" ? "advanced" : "normal",
          question: q.question ?? "",
        };
      }),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/generate]", err);
    return NextResponse.json(
      { error: err?.message ?? "질문 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
