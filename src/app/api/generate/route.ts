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
      // 심화 질문 고정 (홀수 인덱스 5장: 여사제·황제·연인·힘·운명의 수레바퀴)
      const demoQuestions: Record<number, { category: string; difficulty: "normal" | "advanced"; question: string }> = {
        0: {
          category: "직무역량",
          difficulty: "normal",
          question: "본인이 가진 핵심 직무 역량 중 가장 자신 있는 것을 하나 꼽고, 실제 업무나 프로젝트에서 어떻게 발휘했는지 구체적인 사례로 설명해 주세요.",
        },
        1: {
          category: "문제 인식",
          difficulty: "advanced",
          question: "팀원이나 상사도 인지하지 못했던 잠재적 문제를 먼저 발견하고 선제적으로 해결한 경험이 있나요? 당시 어떤 신호를 통해 문제를 감지했고, 어떻게 설득해 행동으로 옮겼나요?",
        },
        2: {
          category: "협업",
          difficulty: "normal",
          question: "서로 다른 배경이나 의견을 가진 팀원들과 협력해 성과를 낸 경험을 말씀해 주세요. 갈등이 있었다면 어떻게 조율했나요?",
        },
        3: {
          category: "리더십",
          difficulty: "advanced",
          question: "책임자로서 팀 전체의 이익과 개인 구성원의 요구가 충돌한 상황을 경험한 적 있나요? 어떤 기준으로 판단했고, 그 결정이 팀에 어떤 영향을 미쳤나요?",
        },
        4: {
          category: "조직적합성",
          difficulty: "normal",
          question: "본인의 가치관과 조직의 방향이 어긋난다고 느꼈던 순간이 있었나요? 그 상황에서 어떻게 대처했는지 말씀해 주세요.",
        },
        5: {
          category: "우선순위",
          difficulty: "advanced",
          question: "여러 업무가 동시에 긴급하게 요구된 상황에서, 자신만의 기준으로 선택을 내린 경험을 말씀해 주세요. 그 선택으로 인해 희생된 것이 있었다면 어떻게 감당했나요?",
        },
        6: {
          category: "목표달성",
          difficulty: "normal",
          question: "스스로 목표를 설정하고 끝까지 밀어붙여 달성한 경험을 말씀해 주세요. 중간에 어떤 어려움이 있었고 어떻게 극복했나요?",
        },
        7: {
          category: "위기극복",
          difficulty: "advanced",
          question: "본인의 능력이나 판단이 도마 위에 올랐던 가장 힘든 순간은 언제였나요? 당시 감정을 어떻게 통제하고 상황을 타개했는지, 그 경험이 지금의 당신에게 어떤 영향을 주었는지 말씀해 주세요.",
        },
        8: {
          category: "자기성찰",
          difficulty: "normal",
          question: "과거의 실패나 아쉬운 경험을 돌아보았을 때, 그 경험에서 무엇을 배웠고 이후 어떻게 행동이 달라졌나요?",
        },
        9: {
          category: "변화적응",
          difficulty: "advanced",
          question: "예상치 못한 환경 변화(조직 개편, 기술 전환, 프로젝트 방향 급변 등)로 기존 계획을 완전히 바꿔야 했던 경험이 있나요? 어떻게 빠르게 적응했고, 그 과정에서 무엇을 배웠나요?",
        },
      };

      const result: GenerateResult = {
        keywords: ["직무이해", "커뮤니케이션", "성장경험", "문제해결", "팀워크", "주도성"],
        questions: ARCANA.map((arc, i) => ({
          id: i,
          arcana: arc.name,
          arcanaKo: arc.nameKo,
          ...demoQuestions[i],
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
