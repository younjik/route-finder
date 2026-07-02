"use client";

import type { InterviewQuestion } from "./types";

// 홈 화면에서 시작한 "나머지 질문 생성" 요청을 /cards 페이지로 이동한 뒤에도 계속 진행하고,
// 완료되면 구독 중인 곳에 알려주는 모듈 레벨(싱글턴) 작업 큐.
// 클라이언트 사이드 라우팅에서는 JS 모듈이 그대로 유지되므로 페이지 전환과 무관하게 동작한다.

export interface BackgroundResult {
  keywords: string[];
  questions: InterviewQuestion[];
}

type ResultListener = (result: BackgroundResult) => void;
type ErrorListener = (message: string) => void;

let pendingPromise: Promise<void> | null = null;
let latestResult: BackgroundResult | null = null;
let latestError: string | null = null;
let resultListeners: ResultListener[] = [];
let errorListeners: ErrorListener[] = [];

export function startBackgroundGenerate(
  files: File[],
  keywords: string[],
  ids: number[],
  advancedCount: number,
) {
  latestResult = null;
  latestError = null;

  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  if (keywords.length > 0) fd.append("keywords", JSON.stringify(keywords));
  fd.append("ids", JSON.stringify(ids));
  fd.append("advancedCount", String(advancedCount));

  pendingPromise = fetch("/api/generate", { method: "POST", body: fd })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "질문 생성에 실패했습니다.");
      latestResult = data as BackgroundResult;
      resultListeners.forEach((fn) => fn(latestResult!));
    })
    .catch((e: any) => {
      latestError = e?.message ?? "질문 생성 중 오류가 발생했습니다.";
      errorListeners.forEach((fn) => fn(latestError!));
    })
    .finally(() => {
      pendingPromise = null;
    });
}

export function hasBackgroundJob(): boolean {
  return pendingPromise !== null;
}

// 구독 시점에 이미 결과/에러가 도착해 있다면 즉시 콜백을 호출한다.
export function onBackgroundResult(fn: ResultListener): () => void {
  if (latestResult) fn(latestResult);
  resultListeners.push(fn);
  return () => {
    resultListeners = resultListeners.filter((l) => l !== fn);
  };
}

export function onBackgroundError(fn: ErrorListener): () => void {
  if (latestError) fn(latestError);
  errorListeners.push(fn);
  return () => {
    errorListeners = errorListeners.filter((l) => l !== fn);
  };
}
