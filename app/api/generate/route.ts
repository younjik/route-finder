import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { anthropic, QuestionResult } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60; // Vercel Pro 필요 (Hobby 플랜은 10s 제한)

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    }
  | {
      type: "image";
      source: { type: "base64"; media_type: "image/png" | "image/jpeg"; data: string };
    };

async function parseResume(file: File): Promise<ContentBlock[]> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.name.toLowerCase().endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return [{ type: "text", text: `[자소서]\n${value}` }];
  }

  // PDF
  return [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: buffer.toString("base64"),
      },
    },
  ];
}

async function parseJobPosting(file: File): Promise<ContentBlock[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase();

  if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg")) {
    const mediaType = ext.endsWith(".png") ? "image/png" : "image/jpeg";
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: buffer.toString("base64"),
        },
      },
    ];
  }

  // PDF
  return [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: buffer.toString("base64"),
      },
    },
  ];
}

const PROMPT = `위 자소서와 채용공고를 분석하여 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "keywords": ["키워드1", "키워드2", "키워드3", "..."],
  "questions": {
    "인성": ["질문1", "질문2", "질문3"],
    "기술_직무": ["질문1", "질문2", "질문3", "질문4"],
    "경험": ["질문1", "질문2", "질문3"]
  }
}

분석 기준:
- keywords: 자소서와 채용공고에서 공통으로 중요한 핵심 키워드 8~12개 (기술스택, 역량, 경험, 자격요건 등)
- 인성 질문 3개: 가치관, 협업, 성격 관련
- 기술_직무 질문 4개: 추출된 기술 키워드 기반의 구체적인 질문
- 경험 질문 3개: 자소서의 구체적인 경험을 파고드는 질문`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File | null;
    const jobFile = formData.get("job") as File | null;

    if (!resumeFile || !jobFile) {
      return NextResponse.json(
        { error: "자소서와 채용공고 파일을 모두 업로드해주세요." },
        { status: 400 }
      );
    }

    // Vercel 4.5MB body 제한 대응 — 파일별 4MB 제한
    const MAX_SIZE = 4 * 1024 * 1024;
    if (resumeFile.size > MAX_SIZE || jobFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 각 4MB 이하로 업로드해주세요." },
        { status: 413 }
      );
    }

    const [resumeBlocks, jobBlocks] = await Promise.all([
      parseResume(resumeFile),
      parseJobPosting(jobFile),
    ]);

    const content: Anthropic.MessageParam["content"] = [
      { type: "text", text: "[자소서]" },
      ...resumeBlocks,
      { type: "text", text: "[채용공고]" },
      ...jobBlocks,
      { type: "text", text: PROMPT },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON 파싱 실패: " + text);
    }

    const result: QuestionResult = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
