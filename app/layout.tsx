import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "면접 타로 — Interview Tarot",
  description: "자소서와 채용공고로 맞춤 면접 질문을 뽑고 AI 피드백을 받으세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
