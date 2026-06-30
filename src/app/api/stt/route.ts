import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const invokeUrl = process.env.CLOVA_SPEECH_INVOKE_URL;
    const secret = process.env.CLOVA_SPEECH_SECRET;

    const inForm = await req.formData();
    const audio = inForm.get("audio") as File | null;
    if (!audio) {
      return NextResponse.json(
        { error: "오디오가 없습니다." },
        { status: 400 },
      );
    }

    if (!invokeUrl || !secret) {
      return NextResponse.json(
        { error: "Clova Speech 환경변수가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const params = {
      language: "ko-KR",
      completion: "sync",
      diarization: {
        enable: true,
        speakerCountMin: 1,
        speakerCountMax: 2,
      },
    };

    // codec 파라미터 제거 (e.g. "audio/webm;codecs=opus" → "audio/webm")
    const mimeType = (audio.type || "audio/webm").split(";")[0].trim();
    const ext = mimeType.split("/")[1] || "webm";

    const upstream = new FormData();
    upstream.append(
      "media",
      new Blob([await audio.arrayBuffer()], { type: mimeType }),
      `answer.${ext}`,
    );
    upstream.append("params", JSON.stringify(params));

    const res = await fetch(`${invokeUrl}/recognizer/upload`, {
      method: "POST",
      headers: {
        "X-CLOVASPEECH-API-KEY": secret,
      },
      body: upstream,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[clova]", res.status, body);
      return NextResponse.json(
        { error: `클로바 STT 오류 (${res.status})`, detail: body },
        { status: 502 },
      );
    }

    const data = await res.json();
    const text: string =
      data.text ||
      (Array.isArray(data.segments)
        ? data.segments.map((s: any) => s.text).join(" ")
        : "") ||
      "";

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[/api/stt]", err);
    return NextResponse.json(
      { error: err?.message ?? "STT 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
