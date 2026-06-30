# Interview Question Generator (타로 면접 연습기)

자소서 + 채용공고를 업로드하면 타로 카드 형식으로 면접 질문을 뽑고, 음성으로 답변하면 Claude가 평가해주는 웹 앱.

---

## 서비스 흐름 (User Journey)

```
[Page 1 — 업로드]
  자소서(PDF/DOCX) + 채용공고(PDF/PNG/JPG) 업로드
  → "질문 생성" 클릭
  → Claude API: 키워드 추출 + 면접 질문 10개 생성
  → sessionStorage에 저장 후 /cards 로 이동

[Page 2 — 타로 카드 스프레드]
  뒷면이 보이는 카드 10장이 테이블에 펼쳐짐 (타로 스타일)
  → 사용자가 카드 클릭
  → 카드 3D 뒤집기 애니메이션
  → 앞면에 면접 질문 공개

[하단 드로어 — 답변 & 평가]
  마이크 버튼 클릭 → 음성 녹음 시작
  → 네이버 클로바 STT → 텍스트 변환 (실시간)
  → "평가 받기" 클릭
  → Claude API: 답변 채점 + 피드백 생성
  → 점수(1-10) + 잘한 점 + 개선할 점 + 총평 표시

  카드를 닫고 다음 카드 선택 가능 → 반복
```

---

## 전체 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│                    사용자 브라우저                            │
│                                                            │
│  ┌─────────────────────┐    ┌──────────────────────────┐  │
│  │   Page 1: /         │    │   Page 2: /cards         │  │
│  │                     │    │                          │  │
│  │  [자소서 업로드]      │    │  ┌──┐ ┌──┐ ┌──┐ ┌──┐   │  │
│  │  [채용공고 업로드]    │    │  │  │ │  │ │  │ │  │   │  │
│  │                     │ →  │  └──┘ └──┘ └──┘ └──┘   │  │
│  │  [질문 생성 버튼]    │    │  ┌──┐ ┌──┐ ┌──┐ ┌──┐   │  │
│  │                     │    │  │  │ │  │ │  │ │  │   │  │
│  └─────────────────────┘    │  └──┘ └──┘ └──┘ └──┘   │  │
│                              │                          │  │
│                              │  [카드 클릭 → 질문 공개]  │  │
│                              │  [마이크 → 음성 답변]     │  │
│                              │  [Claude 평가 결과]       │  │
│                              └──────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                    │                      │
          POST /api/generate    POST /api/stt + /api/evaluate
                    │                      │
                    ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                       │
│                                                            │
│  /api/generate  →  파일 파싱 + Claude 질문 생성             │
│  /api/stt       →  Naver Clova Speech STT 프록시           │
│  /api/evaluate  →  Claude 답변 평가                        │
└────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────┐      ┌─────────────────────────────┐
│   Anthropic Claude   │      │   Naver Cloud Platform      │
│   claude-sonnet-4-6  │      │   Clova Speech (CSR)        │
│                      │      │                             │
│  • 질문 생성          │      │  POST /recog/v1/stt         │
│  • 답변 평가          │      │  audio/pcm → 한국어 텍스트  │
└──────────────────────┘      └─────────────────────────────┘
```

---

## 데이터 흐름 상세

### 1. 질문 생성 흐름 (POST /api/generate)

```
브라우저 → multipart/form-data (resume + job 파일)
                    │
                    ▼
        파일 타입 분기 처리
         ├── DOCX → mammoth → 순수 텍스트
         ├── PDF  → base64  → Claude 네이티브 문서 처리
         └── PNG/JPG → base64 → Claude Vision
                    │
                    ▼
        Claude API 단일 호출
        입력: 자소서 + 채용공고 (텍스트 or document or image)
        출력: {
          keywords: ["키워드1", ...],         // 8~12개
          questions: {
            인성: ["질문1", "질문2", "질문3"],
            기술_직무: ["질문1", ..., "질문4"],
            경험: ["질문1", "질문2", "질문3"]
          }
        }
                    │
                    ▼
        브라우저 sessionStorage 저장
        → router.push('/cards')
```

### 2. 음성 → 텍스트 흐름 (POST /api/stt)

```
마이크 버튼 클릭
    │
    ▼
MediaRecorder (audio/webm)
    │
    ▼  클라이언트 사이드 변환
AudioContext.decodeAudioData()
    │
OfflineAudioContext (16kHz, mono, 1ch)
    │
Int16Array PCM 변환 (Float32 → Int16)
    │
    ▼
POST /api/stt
  Body: raw PCM (audio/pcm)
    │
    ▼
Naver Clova Speech API
  X-NCP-APIGW-API-KEY-ID: {NAVER_CLIENT_ID}
  X-NCP-APIGW-API-KEY: {NAVER_CLIENT_SECRET}
  Content-Type: audio/pcm
    │
    ▼
응답: { text: "인식된 한국어 텍스트" }

※ Naver 미설정 시 브라우저 Web Speech API (SpeechRecognition) 폴백
```

### 3. 답변 평가 흐름 (POST /api/evaluate)

```
입력: {
  question: "질문 텍스트",
  answer: "사용자 음성 답변 텍스트",
  category: "인성" | "기술_직무" | "경험"
}
    │
    ▼
Claude API 호출 (면접관 역할 프롬프트)
    │
    ▼
출력: {
  score: 8,                                    // 1~10점
  strengths: ["잘한 점1", "잘한 점2"],
  improvements: ["개선할 점1", "개선할 점2"],
  summary: "총평 2~3문장"
}
```

---

## 프레임워크 & 라이브러리

| 라이브러리          | 용도              | 선택 이유                                   |
| ------------------- | ----------------- | ------------------------------------------- |
| `Next.js 14`        | 풀스택 프레임워크 | App Router + API Route = 백엔드 분리 불필요 |
| `TypeScript`        | 타입 안전성       | API 요청/응답, 컴포넌트 props 타입 관리     |
| `Tailwind CSS v4`   | 스타일링          | 빠른 UI + 다크 테마                         |
| `react-dropzone`    | 파일 드래그&드롭  | 업로드 UX                                   |
| `mammoth`           | DOCX 파싱         | Word 파일 텍스트 추출 (JS 생태계)           |
| `@anthropic-ai/sdk` | Claude API        | 공식 SDK, PDF/Vision 네이티브 지원          |

### 외부 서비스

| 서비스             | 용도                   | 엔드포인트                                           |
| ------------------ | ---------------------- | ---------------------------------------------------- |
| Anthropic Claude   | 질문 생성 + 답변 평가  | `claude-sonnet-4-6`                                  |
| Naver Clova Speech | 음성 → 텍스트 (한국어) | `https://naveropenapi.apigw.ntruss.com/recog/v1/stt` |
| Vercel             | 배포                   | Frontend + API Routes 통합                           |

---

## 프로젝트 구조

```
interview-question-gen/
├── app/
│   ├── page.tsx                  # Page 1: 파일 업로드
│   ├── cards/
│   │   └── page.tsx              # Page 2: 타로 카드 스프레드 + 답변
│   └── api/
│       ├── generate/
│       │   └── route.ts          # 질문 생성 (기존)
│       ├── evaluate/
│       │   └── route.ts          # 답변 평가 (신규)
│       └── stt/
│           └── route.ts          # Naver Clova STT 프록시 (신규)
├── components/
│   ├── FileUpload.tsx            # 파일 드래그&드롭 (기존)
│   ├── TarotCard.tsx             # 카드 3D 뒤집기 컴포넌트 (신규)
│   └── AnswerDrawer.tsx          # 녹음 + 평가 드로어 (신규)
├── lib/
│   ├── claude.ts                 # Anthropic SDK 래퍼 + 타입 정의
│   └── audio.ts                  # WebM → PCM 16kHz 변환 유틸 (신규)
└── next.config.ts                # bodySizeLimit 설정
```

---

## 화면 설계

### Page 1 — 업로드 (`/`)

```
┌──────────────────────────────────────────┐
│         면접 질문 생성기                   │
│  자소서와 채용공고로 맞춤 질문을 만들어드려요  │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │   자소서      │  │   채용공고    │     │
│  │  📄 PDF/DOCX │  │  📄 PDF/PNG  │     │
│  │  드래그하세요  │  │  드래그하세요  │     │
│  └──────────────┘  └──────────────┘     │
│                                          │
│          [ 면접 질문 생성 ]               │
└──────────────────────────────────────────┘
```

### Page 2 — 타로 카드 (`/cards`)

```
┌──────────────────────────────────────────┐
│   ✦  카드를 하나 선택하세요  ✦            │
│   [React] [협업] [문제해결] ...키워드     │
│                                          │
│   ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐        │
│   │뒷│  │뒷│  │뒷│  │✓ │  │뒷│        │  ← ✓ = 이미 답변한 카드
│   │면│  │면│  │면│  │완│  │면│        │
│   └──┘  └──┘  └──┘  └──┘  └──┘        │
│   ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐        │
│   │뒷│  │뒷│  │뒷│  │뒷│  │뒷│        │
│   │면│  │면│  │면│  │면│  │면│        │
│   └──┘  └──┘  └──┘  └──┘  └──┘        │
│                                          │
│  ──────── 선택한 카드 ──────────         │
│  [기술/직무]                             │
│  "지금까지 가장 어려웠던 기술적 문제와     │
│   해결 과정을 설명해주세요."              │
│                                          │
│   [ 🎤 답변 시작 ] / [ ⏹ 녹음 중지 ]    │
│                                          │
│  "지금 말씀하시는 내용이 여기 표시됩니다..." │
│                                          │
│      [ 평가 받기 ]                       │
│                                          │
│  ── 평가 결과 ──                         │
│  점수: 8/10  ████████░░                 │
│  잘한 점: 구체적 사례를 들었습니다         │
│  개선할 점: 결과 수치 언급 필요           │
│  총평: 전반적으로 논리적인 답변입니다...   │
└──────────────────────────────────────────┘
```

---

## 타로 카드 UI 상세

### 카드 상태 머신

```
[idle] 뒷면 보임
  │ 클릭
  ▼
[flipped] 3D 뒤집기 → 앞면(질문) 공개
  │ 드로어 열림
  ▼
[recording] 마이크 활성화, 실시간 텍스트 표시
  │ 녹음 중지
  ▼
[transcribed] 텍스트 확인
  │ "평가 받기" 클릭
  ▼
[evaluating] Claude API 호출 중
  │ 응답 수신
  ▼
[evaluated] 점수 + 피드백 표시, 카드 완료(✓) 표시
```

### 카드 3D 뒤집기 (CSS)

```css
.card-scene {
  perspective: 1200px;
}
.card-inner {
  transform-style: preserve-3d;
  transition: 0.65s;
}
.card-inner.flipped {
  transform: rotateY(180deg);
}
.card-back,
.card-front {
  backface-visibility: hidden;
}
.card-front {
  transform: rotateY(180deg);
}
```

### 카드 뒷면 디자인

- 배경: 딥 인디고 (#1e1035)
- 테두리: 금색/앰버 이중 선
- 중앙: 눈(Eye of Providence) 문양 SVG
- 코너: ✦ 장식
- 상하: ⟡ 장식

### 카드 앞면 디자인

- 카테고리별 그라디언트:
  - 인성: 보라 (`from-purple-900 to-purple-950`)
  - 기술\_직무: 파랑 (`from-blue-900 to-blue-950`)
  - 경험: 초록 (`from-emerald-900 to-emerald-950`)
- 상단: 카테고리 배지
- 중앙: 질문 텍스트 (앰버/골드 컬러)

---

## 환경 변수

```env
# .env.local

# Claude API (필수)
ANTHROPIC_API_KEY=sk-ant-...

# Naver Clova Speech (선택 — 미설정 시 Web Speech API 폴백)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

### Naver Clova Speech 설정 방법

1. [Naver Cloud Platform](https://www.ncloud.com) 콘솔 접속
2. AI·NAVER API → Clova Speech Recognition (CSR) → 이용 신청
3. Application 등록 후 Client ID / Secret 발급
4. `.env.local`에 추가

---

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local에 ANTHROPIC_API_KEY 입력

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```

---

## 배포 (Vercel)

```bash
vercel deploy

# 환경 변수 등록
vercel env add ANTHROPIC_API_KEY
vercel env add NAVER_CLIENT_ID
vercel env add NAVER_CLIENT_SECRET
```

---

## 주의사항

- **파일 크기**: Next.js 기본 4MB → `next.config.ts`에서 `bodySizeLimit: '10mb'` 설정 필요
- **STT 오디오 포맷**: Naver Clova는 WebM 미지원 → 클라이언트에서 PCM 16kHz 변환 후 전송
- **Web Speech API 폴백**: Naver 미설정 시 Chrome/Edge에서만 동작 (Safari 미지원)
- **Claude JSON 파싱**: 응답이 마크다운 코드블록으로 감싸질 수 있음 → 정규식으로 추출
- **sessionStorage**: 페이지 새로고침 시 초기화 → 업로드 페이지로 리다이렉트 처리 필요
