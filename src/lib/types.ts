export interface StarGuide {
  situation: string; // 상황: 어떤 배경/상황이었는지
  task: string;       // 과제: 맡았던 목표·역할
  action: string;     // 행동: 구체적으로 취한 행동
  result: string;     // 결과: 결과와 배운 점
}

export interface QuestionHint {
  keywords: string[];      // 답변에 포함하면 좋은 핵심 키워드
  star: StarGuide;         // 질문에 맞춘 STAR 기법 가이드
  sampleAnswer: string;    // 답변 예시(요약형)
}

export interface InterviewQuestion {
  id: number;
  arcana: string;        // 카드 이름 (예: "The Magician")
  arcanaKo: string;      // 카드 한글 이름
  category: string;      // 질문 유형 (예: "직무역량", "인성", "경험")
  question: string;      // 면접 질문
  difficulty: "normal" | "advanced"; // 뒤집기 전까지 비공개, 심화는 금색 카드로 공개
  keywords?: string[];   // API 연동 시 질문 생성에 사용된 키워드 (자소서·공고 기반)
  hint?: QuestionHint;   // 질문 생성 시 함께 만들어지는 면접 팁(힌트)
}

export interface GenerateResult {
  keywords: string[];
  questions: InterviewQuestion[];
}

export interface Evaluation {
  score: number;         // 1-10
  strengths: string[];   // 잘한 점
  improvements: string[];// 개선할 점
  summary: string;       // 총평
}

export interface AnsweredCard {
  questionId: number;
  arcanaKo: string;
  question: string;
  transcript: string;
  evaluation: Evaluation;
  answeredAt: number;
}
