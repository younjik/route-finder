import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}
