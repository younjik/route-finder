import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Naver STT credentials not configured" },
        { status: 503 }
      );
    }

    const audioBuffer = await req.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "오디오 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // 10MB 제한
    if (audioBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "오디오 파일이 너무 큽니다 (최대 10MB)." },
        { status: 413 }
      );
    }

    const response = await fetch(
      "https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor",
      {
        method: "POST",
        headers: {
          "X-NCP-APIGW-API-KEY-ID": clientId,
          "X-NCP-APIGW-API-KEY": clientSecret,
          "Content-Type": "audio/pcm",
        },
        body: audioBuffer,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? `Naver STT error: ${response.status}`);
    }

    return NextResponse.json({ text: data.text ?? "" });
  } catch (err) {
    console.error("[/api/stt]", err);
    const message = err instanceof Error ? err.message : "STT 변환 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
