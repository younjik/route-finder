// 클라이언트 전용 — 서버 컴포넌트에서 import 금지
// 브라우저 MediaRecorder 출력(WebM/OGG)을 Naver Clova가 요구하는
// PCM 16kHz 16-bit mono 형식으로 변환합니다.
export async function blobToPCM16kHz(blob: Blob): Promise<ArrayBuffer> {
  const arrayBuffer = await blob.arrayBuffer();

  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const TARGET_RATE = 16000;
  const frameCount = Math.ceil(decoded.duration * TARGET_RATE);
  const offCtx = new OfflineAudioContext(1, frameCount, TARGET_RATE);
  const src = offCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offCtx.destination);
  src.start(0);

  const resampled = await offCtx.startRendering();
  const f32 = resampled.getChannelData(0);
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
  }
  return i16.buffer;
}
