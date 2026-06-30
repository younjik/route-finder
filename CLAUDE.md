# Interview Question Generator — Technical Reference

타로 카드 스타일 면접 연습 앱. 자소서 + 채용공고 업로드 → 타로 카드로 질문 뽑기 → 음성 답변 → Claude 평가.

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                Next.js (Frontend + Backend)             │
│                                                         │
│  app/page.tsx          → 파일 업로드 페이지              │
│  app/cards/page.tsx    → 타로 카드 스프레드 + 답변 페이지  │
│  app/api/generate/     → Claude 질문 생성               │
│  app/api/stt/          → Naver Clova STT 프록시          │
│  app/api/evaluate/     → Claude 답변 평가               │
└─────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
   Anthropic Claude API         Naver Clova Speech
   (질문생성 + 평가)              (음성 → 텍스트)
```

### 데이터 흐름

```
[파일 업로드]
    │
    ├── DOCX → mammoth → 순수 텍스트 → Claude
    ├── PDF  → base64  → Claude 네이티브 문서 타입
    └── PNG/JPG → base64 → Claude Vision

[Claude 단일 호출 → 질문 생성]
    출력: { keywords: [...], questions: { 인성, 기술_직무, 경험 } }
    저장: sessionStorage → router.push('/cards')

[타로 카드 페이지]
    카드 클릭 → 3D 뒤집기 → 질문 공개

[음성 답변]
    MediaRecorder(webm) → PCM 변환(client) → /api/stt → Naver → 텍스트
    폴백: SpeechRecognition API (Chrome/Edge 내장)

[답변 평가]
    POST /api/evaluate { question, answer, category }
    → Claude → { score, strengths, improvements, summary }
```

---

## 프로젝트 구조

```
interview-question-gen/
├── app/
│   ├── page.tsx                  # 파일 업로드 페이지
│   ├── cards/
│   │   └── page.tsx              # 타로 카드 메인 페이지
│   └── api/
│       ├── generate/route.ts     # 질문 생성 API
│       ├── stt/route.ts          # Naver STT 프록시
│       └── evaluate/route.ts     # 답변 평가 API
├── components/
│   ├── FileUpload.tsx            # 드래그&드롭 업로드
│   ├── TarotCard.tsx             # 카드 3D 뒤집기
│   └── AnswerDrawer.tsx          # 녹음 + 평가 UI
├── lib/
│   ├── claude.ts                 # Anthropic SDK + 타입 정의
│   └── audio.ts                  # WebM → PCM 변환 (클라이언트 전용)
└── next.config.ts
```

---

## 타입 정의 (`lib/claude.ts`)

```typescript
export interface QuestionResult {
  keywords: string[];
  questions: {
    인성: string[];
    기술_직무: string[];
    경험: string[];
  };
}

export interface InterviewQuestion {
  id: number;
  category: "인성" | "기술_직무" | "경험";
  question: string;
}

export interface EvaluationResult {
  score: number;           // 1~10
  strengths: string[];
  improvements: string[];
  summary: string;
}
```

---

## API Routes 구현

### 1. `app/api/generate/route.ts` — 질문 생성

```typescript
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { anthropic } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

// 자소서: DOCX → 텍스트, PDF → base64 document
// 채용공고: PNG/JPG → base64 image, PDF → base64 document
// → Claude 단일 호출 → { keywords, questions } JSON 반환

const PROMPT = `위 자소서와 채용공고를 분석하여 아래 JSON 형식으로만 응답하세요.
{
  "keywords": ["키워드1", ...],
  "questions": {
    "인성": ["질문1", "질문2", "질문3"],
    "기술_직무": ["질문1", "질문2", "질문3", "질문4"],
    "경험": ["질문1", "질문2", "질문3"]
  }
}`;
```

### 2. `app/api/stt/route.ts` — Naver Clova STT 프록시

```typescript
export async function POST(req: Request) {
  // 수신: raw PCM binary (audio/pcm, 16kHz, 16bit, mono)
  // 전달: Naver Clova Speech API
  // 반환: { text: "인식된 텍스트" }

  const audioBuffer = await req.arrayBuffer();
  const response = await fetch(
    "https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor",
    {
      method: "POST",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_CLIENT_ID!,
        "X-NCP-APIGW-API-KEY": process.env.NAVER_CLIENT_SECRET!,
        "Content-Type": "audio/pcm",
      },
      body: audioBuffer,
    }
  );
}
```

### 3. `app/api/evaluate/route.ts` — 답변 평가

```typescript
// 수신: { question, answer, category }
// Claude에게 면접관 역할 부여 → JSON 평가 반환

const PROMPT = `당신은 면접관입니다. 다음 답변을 평가해주세요.
카테고리: ${category}
질문: ${question}
답변: ${answer}

JSON으로만 반환:
{
  "score": 8,
  "strengths": ["잘한 점"],
  "improvements": ["개선할 점"],
  "summary": "총평"
}`;
```

---

## 핵심 컴포넌트

### `components/TarotCard.tsx`

Props:
```typescript
interface TarotCardProps {
  question: InterviewQuestion;
  isFlipped: boolean;   // 카드 앞면/뒷면
  isDone: boolean;      // 이미 답변 완료
  rotation: number;     // 카드 기울기 (deg) — 자연스러운 스프레드 연출
  onClick: () => void;
}
```

CSS 3D 뒤집기:
```css
.card-scene   { perspective: 1200px }
.card-inner   { transform-style: preserve-3d; transition: 0.65s cubic-bezier(0.4,0,0.2,1) }
.is-flipped   { transform: rotateY(180deg) }
.card-back,
.card-front   { backface-visibility: hidden }
.card-front   { transform: rotateY(180deg) }
```

카드 뒷면 SVG (Eye of Providence 문양):
- 딥 인디고 배경 (#1e1035)
- 금색 이중 테두리
- 중앙 눈 문양 + 방사형 라인
- 코너/상하 ✦ 장식

카드 앞면:
- 카테고리별 다크 그라디언트 (인성=보라, 기술=파랑, 경험=초록)
- 앰버 금색 질문 텍스트
- 완료 시 반투명 처리 + ✓ 배지

### `components/AnswerDrawer.tsx`

하단에서 슬라이드업 되는 드로어. 세 단계:

1. **질문 표시**: 카테고리 배지 + 질문 텍스트
2. **녹음 UI**: 마이크 버튼(활성/비활성) + 실시간 텍스트 표시 + 중지 버튼
3. **평가 결과**: 점수 바 + 잘한 점(초록) + 개선할 점(황색) + 총평

### `lib/audio.ts` — PCM 변환 (클라이언트 전용)

```typescript
export async function blobToPCM16kHz(blob: Blob): Promise<ArrayBuffer> {
  const arrayBuffer = await blob.arrayBuffer();

  // 1. WebM/OGG 등 브라우저 포맷 디코딩
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  // 2. 16kHz, 1채널로 리샘플링
  const TARGET_RATE = 16000;
  const frameCount = Math.ceil(decoded.duration * TARGET_RATE);
  const offCtx = new OfflineAudioContext(1, frameCount, TARGET_RATE);
  const src = offCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offCtx.destination);
  src.start(0);
  const resampled = await offCtx.startRendering();

  // 3. Float32 → Int16 변환
  const f32 = resampled.getChannelData(0);
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
  }
  return i16.buffer;
}
```

---

## 페이지 상태 관리

### `app/page.tsx` (업로드 페이지)

```typescript
// 상태
const [resumeFile, setResumeFile] = useState<File | null>(null);
const [jobFile, setJobFile] = useState<File | null>(null);
const [loading, setLoading] = useState(false);

// 생성 후 처리
const handleGenerate = async () => {
  const res = await fetch("/api/generate", { method: "POST", body: formData });
  const { result } = await res.json();
  sessionStorage.setItem("interviewData", JSON.stringify(result));
  router.push("/cards");
};
```

### `app/cards/page.tsx` (타로 카드 페이지)

```typescript
// 초기화
useEffect(() => {
  const raw = sessionStorage.getItem("interviewData");
  if (!raw) { router.push("/"); return; }
  const data: QuestionResult = JSON.parse(raw);
  // questions 배열 평탄화 (인성 3 + 기술 4 + 경험 3 = 10장)
  setQuestions(flattenQuestions(data.questions));
  setKeywords(data.keywords);
}, []);

// 상태
const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
const [keywords, setKeywords] = useState<string[]>([]);
const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
const [selectedId, setSelectedId] = useState<number | null>(null);
const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});

// 카드 클릭
const handleCardClick = (q: InterviewQuestion) => {
  setFlippedIds(prev => new Set(prev).add(q.id));
  setSelectedId(q.id);
};
```

---

## 타로 카드 레이아웃

```
카드 10장 배치:
- flex-wrap justify-center
- 각 카드: w-[140px] h-[200px]
- 카드별 고정 rotation: [-3, 1.5, -1, 2, -0.5, 1, -2, 0.5, -1.5, 2.5] deg
- 호버: scale-105 + translateY(-8px) + rotation 0 (transition)
- 완료 카드: opacity-60 + 포인터 비활성
```

---

## 녹음 흐름 구현

```typescript
// Web Speech API (기본)
const startWebSpeech = () => {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const r = new SR();
  r.lang = "ko-KR";
  r.continuous = true;
  r.interimResults = true;
  r.onresult = (e) => { /* 실시간 텍스트 업데이트 */ };
  r.start();
};

// Naver Clova (NAVER_CLIENT_ID 설정 시)
const startNaver = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const pcm = await blobToPCM16kHz(blob);  // lib/audio.ts
    const res = await fetch("/api/stt", {
      method: "POST",
      headers: { "Content-Type": "audio/pcm" },
      body: pcm,
    });
    const { text } = await res.json();
    setTranscript(text);
  };
  recorder.start();
};
```

---

## 환경 변수

```env
ANTHROPIC_API_KEY=sk-ant-...          # 필수
NAVER_CLIENT_ID=...                   # 선택 (미설정 시 Web Speech API 폴백)
NAVER_CLIENT_SECRET=...               # 선택
```

## next.config.ts 설정

```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
```

---

## 구현 순서

1. `lib/claude.ts` — EvaluationResult, InterviewQuestion 타입 추가
2. `app/api/evaluate/route.ts` — 답변 평가 API (신규)
3. `app/api/stt/route.ts` — Naver STT 프록시 (신규)
4. `lib/audio.ts` — PCM 변환 유틸 (신규)
5. `app/globals.css` — 카드 3D 애니메이션 CSS 추가
6. `components/TarotCard.tsx` — 카드 컴포넌트 (신규)
7. `components/AnswerDrawer.tsx` — 답변/평가 드로어 (신규)
8. `app/cards/page.tsx` — 타로 카드 페이지 (신규)
9. `app/page.tsx` — sessionStorage 저장 + /cards 라우팅으로 수정
10. `next.config.ts` — bodySizeLimit 업데이트

---

## 주의사항

- `lib/audio.ts`는 `AudioContext`/`OfflineAudioContext` 사용 → 클라이언트 전용, `"use client"` 파일에서만 import
- Naver Clova는 WebM 미지원 → PCM 변환 필수
- `SpeechRecognition` TypeScript 타입: `window.SpeechRecognition ?? window.webkitSpeechRecognition`
- 카드 rotation 값은 컴포넌트 외부 상수 배열로 정의 (렌더링마다 변경되지 않도록)
- sessionStorage 없으면 `/` 리다이렉트 — 새로고침 방어 처리
- Claude 응답에서 JSON 추출 시 `rawText.match(/\{[\s\S]*\}/)` 사용 (코드블록 감싸기 대응)
