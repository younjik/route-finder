"use client";

import type { ArcanaMeta } from "@/lib/arcana";

export function TarotCard({
  arc,
  index,
  flipped,
  answered,
  advanced,
  score,
  category,
  onClick,
}: {
  arc: ArcanaMeta;
  index: number;
  flipped: boolean;
  answered: boolean;
  advanced?: boolean;
  score?: number;
  category?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`card ${flipped ? "flipped" : ""} ${answered ? "answered" : ""} ${advanced && flipped ? "advanced" : ""}`}
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={onClick}
      aria-label={`${arc.nameKo} 카드`}
    >
      <div className="inner">
        {/* 뒷면 */}
        <div className="face back" />
        {/* 앞면 */}
        <div className="face front">
          <div className="numeral serif">{arc.numeral}</div>
          <div className="glyph serif">{arc.glyph}</div>
          {flipped && category
            ? <div className="name serif category">{category}</div>
            : <>
                <div className="name serif">{arc.nameKo}</div>
                <div className="name-en">{arc.name}</div>
              </>
          }
        </div>
      </div>

      <style jsx>{`
        .card {
          all: unset;
          cursor: pointer;
          display: block;
          width: 100%;
          aspect-ratio: 2 / 3;
          perspective: 1200px;
          animation: deal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
        }
        @keyframes deal {
          from { opacity: 0; transform: translateY(24px) rotateZ(-4deg); }
          to { opacity: 1; transform: translateY(0) rotateZ(0); }
        }
        .inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.4, 0.1, 0.2, 1);
        }
        .card.flipped .inner { transform: rotateY(180deg); }
        .card:hover .inner { transform: translateY(-6px) rotateZ(1deg); }
        .card.flipped:hover .inner { transform: rotateY(180deg) translateY(-6px); }

        .face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(238,160,214,0.5);
          box-shadow:
            0 0 0 1px rgba(243,182,224,0.12),
            0 8px 24px rgba(0,0,0,0.75),
            0 16px 48px rgba(0,0,0,0.6),
            0 0 30px rgba(0,0,0,0.5) inset;
        }

        /* 뒷면 */
        .back {
          background: #14102b url('/타로 카드 뒷면.png') center center / cover no-repeat;
        }

        /* 앞면 */
        .front {
          transform: rotateY(180deg);
          /* 일반 질문 카드 — 원본 이미지 여백을 확대해 카드 테두리까지 꽉 채움 */
          background: #15122c url('/보라색 카드 앞면.png') 50% 38% / 119% 112% no-repeat;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
        }
        .numeral {
          position: absolute;
          top: 10px;
          font-size: 13px;
          color: var(--gold);
          letter-spacing: 0.1em;
        }
        .glyph {
          font-size: clamp(30px, 8vw, 46px);
          color: var(--gold-bright);
        }
        .name {
          font-size: clamp(15px, 3.5vw, 19px);
          color: var(--parchment);
        }
        .name-en {
          font-size: 9.5px;
          letter-spacing: 0.16em;
          color: var(--mist);
          text-transform: uppercase;
        }
        .category {
          font-size: clamp(13px, 3vw, 17px);
          color: var(--gold-bright);
          letter-spacing: 0.08em;
          text-shadow: 0 0 14px rgba(243,182,224,0.5);
        }
        .card.answered .front {
          border-color: var(--gold);
        }

        /* 심화 카드 앞면 */
        .card.advanced .front {
          background:
            radial-gradient(circle at 50% 30%, rgba(201,162,75,0.35), transparent 60%),
            url('/앞면 수정.png') 50% 38% / 119% 112% no-repeat;
          border-color: rgba(201,162,75,0.7);
          box-shadow:
            0 0 0 1px rgba(201,162,75,0.3),
            0 10px 30px rgba(201,162,75,0.2);
        }
        .card.advanced .glyph { color: #ffe8a0; }
        .card.advanced .name  { color: #f5e6c0; }
        .card.advanced .name-en { color: rgba(245,230,192,0.55); }
        .card.advanced .numeral { color: var(--gold-bright); }

      `}</style>
    </button>
  );
}
