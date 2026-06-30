# 타로 면접 · Arcana Interview

자소서와 채용공고를 업로드하면 Claude가 예상 면접 질문 10개를 뽑아 **타로 카드**로 펼칩니다.
카드를 뒤집어 질문을 받고, 1분 준비 후 음성으로 답하면 → Naver Clova가 텍스트로 옮기고 → Claude가 점수와 피드백을 줍니다.
결과는 한 장의 이미지로 저장할 수 있습니다.

## 흐름

1. **/** — 자소서(PDF/DOCX) + 채용공고(PDF/이미지) 업로드 → `질문 생성하기` → Claude가 키워드 추출 + 질문 10개 생성 → `/cards`로 이동
2. **/cards** — 카드 10장 스프레드. 클릭 → 3D 뒤집기 → 질문 공개 → 하단 드로어
   - `준비 시작` → **1분 카운트다운** (건너뛰기 가능)
   - 자동으로 **녹음 시작** (최대 2분, 직접 종료 가능)
   - 종료 → Clova STT → Claude 평가 → 점수(1–10) + 잘한 점 + 개선점 + 총평
3. **결과 보기** — 답변한 카드 요약 모달 → `📷 사진으로 저장`으로 PNG 다운로드

## 실행

```bash
npm install
npm run dev                        # http://localhost:3000  ← 키 없이 바로 데모 모드로 동작
```

키를 연결해 실제 Claude·Clova를 쓰려면:

```bash
cp .env.local.example .env.local   # 키 입력 후 서버 재시작
```

## 데모 모드 (키 없이 화면 확인)

`.env.local` 없이 실행하면 모든 API가 **데모 폴백**으로 동작해, 외부 호출 없이 전체 화면·흐름을 둘러볼 수 있습니다.

| 라우트 | 키 없을 때 동작 |
|--------|----------------|
| `/api/generate` | 파일 파싱·Claude 호출 없이 타로 카드에 매핑된 **데모 질문 10개** 반환 |
| `/api/evaluate` | Claude 호출 없이 **샘플 평가**(점수·잘한 점·개선점·총평) 반환 |
| `/api/stt` | Clova 호출 없이 **안내 텍스트** 반환 |

> 각 라우트는 `if (!process.env.ANTHROPIC_API_KEY)` / 키 존재 여부로 분기하므로, `.env.local`에 키만 넣으면 **코드 수정 없이** 곧바로 실제 API 경로로 전환됩니다.

## 환경변수 (`.env.local`)

| 변수                      | 설명                               |
| ------------------------- | ---------------------------------- |
| `ANTHROPIC_API_KEY`       | Anthropic API 키 (질문 생성·평가)  |
| `CLOVA_SPEECH_INVOKE_URL` | Naver Clova Speech(CSR) Invoke URL |
| `CLOVA_SPEECH_SECRET`     | Clova Speech Secret Key            |

> 키는 `.gitignore`에 의해 커밋되지 않습니다(`.env*.local`). 저장소에는 플레이스홀더 템플릿(`.env.local.example`)만 올라갑니다.

## 구조

```
src/
  app/
    page.tsx              # Page 1 — 업로드
    cards/page.tsx        # Page 2 — 타로 스프레드 + 결과
    api/
      generate/route.ts   # 파일 파싱 + Claude 질문 생성
      stt/route.ts        # Clova Speech 프록시
      evaluate/route.ts   # Claude 답변 평가
  components/
    TarotCard.tsx         # 카드 + 3D 뒤집기
    AnswerDrawer.tsx      # 타이머·녹음·STT·평가 드로어
  lib/
    arcana.ts             # 메이저 아르카나 10장 데이터
    parse.ts              # PDF/DOCX/이미지 파싱
    useRecorder.ts        # MediaRecorder 훅
    types.ts
```

## 메모

- 상태는 `sessionStorage`에 저장 — 새로고침해도 답변 유지, 처음 화면으로 가면 초기화.
- 녹음은 브라우저 `MediaRecorder`(webm/mp4) 사용 → 마이크 권한 필요.
- Clova Speech `recognizer/upload` 동기(sync) 엔드포인트 기준. 콘솔에서 도메인 발급 후 Invoke URL을 그대로 넣으세요.
