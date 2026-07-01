import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { parseUpload } from "@/lib/parse";
import { ARCANA } from "@/lib/arcana";
import type { GenerateResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const uploadedFiles = form
      .getAll("files")
      .filter((f): f is File => f instanceof File)
      .slice(0, 8);
    const keywordsRaw = form.get("keywords") as string | null;

    let userKeywords: string[] = [];
    if (keywordsRaw) {
      try {
        const parsedKw = JSON.parse(keywordsRaw);
        if (Array.isArray(parsedKw)) {
          userKeywords = parsedKw
            .filter((k) => typeof k === "string" && k.trim())
            .map((k) => k.trim());
        }
      } catch { /* 무시 */ }
    }

    if (uploadedFiles.length === 0 && userKeywords.length === 0) {
      return NextResponse.json(
        { error: "자소서·채용공고 파일이나 키워드 중 하나 이상을 입력해 주세요." },
        { status: 400 }
      );
    }

    const parsedFiles = await Promise.all(
      uploadedFiles.map(async (f) => ({ name: f.name, parsed: await parseUpload(f) })),
    );

    const hasDocs = parsedFiles.length > 0;
    const sourceLabels = [
      hasDocs ? "[업로드한 자료(자소서·채용공고 등)]" : null,
      userKeywords.length > 0 ? "[희망 키워드]" : null,
    ].filter(Boolean);
    const sourceLabel = sourceLabels.join("와 ");

    const arcanaList = ARCANA.map((a, i) => `${i}: ${a.nameKo}(${a.name}) — ${a.hint}`).join("\n");

    // 시스템 프롬프트
    const systemPrompt =
      `당신은 한국 기업의 채용 면접관입니다. 아래의 ${sourceLabel}를 분석해 ` +
      "핵심 키워드를 추출하고, 실제 면접에서 나올 법한 한국어 예상 면접 질문 10개를 만드세요.\n\n" +
      "각 질문은 서로 다른 영역을 다루도록 하세요(직무역량, 경험, 인성, 조직적합성, 문제해결, 지원동기 등). " +
      (hasDocs
        ? "업로드된 자료들 각각이 자소서인지 채용공고인지는 내용을 보고 스스로 판단하고, 그 내용을 구체적으로 반영해 두루뭉술하지 않고 날카로운 질문을 만드세요.\n\n"
        : "자소서·채용공고가 제공되지 않았으므로, 실제로 확인되지 않은 경력·수치·회사명 등은 절대 지어내지 말고, 아래 희망 키워드를 중심으로 일반적이지만 날카로운 면접 질문을 구성하세요.\n\n") +
      "각 질문마다 지원자가 답변을 준비할 때 참고할 '힌트'도 함께 만드세요. 각 항목은 반드시 간결하게 작성하세요:\n" +
      "- keywords: 답변에 포함하면 좋은 핵심 키워드 정확히 3개 (짧은 단어/구)\n" +
      "- star: STAR 기법 가이드(situation/task/action/result 각 한 문장)\n" +
      "- sampleAnswer: 답변 예시 딱 2문장 요약\n\n" +
      "10개의 질문은 아래 10장의 타로 카드 순서(index 0~9)에 1:1로 매핑하세요.\n" +
      "10개 중 정확히 5개는 difficulty를 \"advanced\"로, 나머지 5개는 \"normal\"로 설정하세요.\n\n" +
      `타로 카드:\n${arcanaList}\n\n` +
      "반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드펜스나 설명 없이 JSON 객체 하나만 출력합니다.\n\n" +
      `{
  "keywords": ["키워드1", "키워드2", ...],
  "questions": [
    {
      "id": 0,
      "category": "직무역량",
      "difficulty": "normal",
      "question": "...",
      "hint": {
        "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"],
        "star": {
          "situation": "한 문장 안내",
          "task": "한 문장 안내",
          "action": "한 문장 안내",
          "result": "한 문장 안내"
        },
        "sampleAnswer": "예시 답변 2문장"
      }
    }
  ]
}`;

    // 유저 메시지 구성 (텍스트 + 이미지 혼합)
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

    for (const { name, parsed } of parsedFiles) {
      userContent.push({ type: "text", text: `[업로드 자료: ${name}]` });
      if (parsed.text.trim()) {
        userContent.push({ type: "text", text: parsed.text.slice(0, 12000) });
      } else if (parsed.imageBase64) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${parsed.mediaType};base64,${parsed.imageBase64}`,
          },
        });
      }
    }

    if (userKeywords.length > 0) {
      userContent.push({
        type: "text",
        text:
          `[희망 키워드]\n${userKeywords.join(", ")}\n` +
          "지원자가 직접 입력한 키워드입니다. 각 키워드의 성격을 스스로 판단해 10개의 질문에 자연스럽게 녹여내세요.",
      });
    }

    if (userContent.length === 0) {
      userContent.push({ type: "text", text: "위 지시에 따라 질문을 생성하세요." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = (response.choices[0].message.content ?? "")
      .replace(/```json|```/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("OpenAI 응답 파싱 실패");
      parsed = JSON.parse(m[0]);
    }

    const result: GenerateResult = {
      keywords: parsed.keywords ?? [],
      questions: (parsed.questions ?? []).slice(0, 10).map((q: any, i: number) => {
        const arc = ARCANA[q.id ?? i] ?? ARCANA[i];
        const h = q.hint ?? {};
        return {
          id: q.id ?? i,
          arcana: arc.name,
          arcanaKo: arc.nameKo,
          category: q.category ?? "면접",
          difficulty: q.difficulty === "advanced" ? "advanced" : "normal",
          question: q.question ?? "",
          hint: {
            keywords: Array.isArray(h.keywords) ? h.keywords : [],
            star: {
              situation: h.star?.situation ?? "",
              task: h.star?.task ?? "",
              action: h.star?.action ?? "",
              result: h.star?.result ?? "",
            },
            sampleAnswer: h.sampleAnswer ?? "",
          },
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
