import { ARCANA } from "./arcana";
import type { InterviewQuestion } from "./types";

// 카드 화면 진입 직후 바로 답변을 시작할 수 있도록 미리 준비해두는 고정 질문.
// (자소서·채용공고 분석 없이도 항상 물어볼 수 있는 자기소개 + 지원동기 질문)
export const FIXED_QUESTION_ID = 4;

const arc = ARCANA[FIXED_QUESTION_ID];

export const FIXED_QUESTION: InterviewQuestion = {
  id: FIXED_QUESTION_ID,
  arcana: arc.name,
  arcanaKo: arc.nameKo,
  category: "지원동기",
  difficulty: "normal",
  question: "간단한 자기소개와 함께, 이 회사와 직무에 지원하게 된 동기를 말씀해 주세요.",
  hint: {
    keywords: ["핵심 경험", "지원 계기", "직무 연관성"],
    star: {
      situation: "본인을 소개할 수 있는 배경과 지원을 결심한 계기를 함께 짚으세요.",
      task: "이 회사·직무에서 본인이 하고 싶은 역할을 짚으세요.",
      action: "그동안 쌓아온 경험이나 지원을 위해 준비한 과정을 구체적으로 말하세요.",
      result: "합류했을 때 기대하는 성장이나 기여로 마무리하세요.",
    },
    sampleAnswer:
      "저는 문제를 데이터로 확인하고 해결하는 것을 좋아하는 사람입니다. 채용공고를 보고 제 경험과 직무 요건이 잘 맞는다고 생각해 지원했고, 합류하게 되면 그 경험을 바탕으로 빠르게 기여하고 싶습니다.",
  },
};
