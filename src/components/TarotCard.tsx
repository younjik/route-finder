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
        <div className="face back">
          <div className="back-frame">
            <div className="back-glyph serif">✶</div>
            <div className="back-lines" />
          </div>
        </div>
        {/* 앞면 */}
        <div className="face front">
          <div className="numeral serif">{arc.numeral}</div>
          {advanced && flipped && (
            <div className="advanced-mark">✦ 심화</div>
          )}
          <div className="glyph serif">{arc.glyph}</div>
          {flipped && category
            ? <div className="name serif category">{category}</div>
            : <>
                <div className="name serif">{arc.nameKo}</div>
                <div className="name-en">{arc.name}</div>
              </>
          }
          {answered && score != null && (
            <div className="score-badge">{score}</div>
          )}
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
          background:
            radial-gradient(circle at 50% 40%, rgba(201,162,75,0.18), transparent 60%),
            linear-gradient(160deg, #221d44, #14102b);
        }
        .back-frame {
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(238,160,214,0.4);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px rgba(217,142,201,0.15) inset;
        }
        .back-glyph {
          font-size: clamp(28px, 7vw, 44px);
          color: var(--gold-bright);
          opacity: 1;
          text-shadow: 0 0 20px rgba(243,182,224,0.6);
        }
        .back-lines {
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(45deg, rgba(201,162,75,0.06) 0 6px, transparent 6px 12px);
        }

        /* 앞면 */
        .front {
          transform: rotateY(180deg);
          background:
            radial-gradient(circle at 50% 30%, rgba(201,162,75,0.16), transparent 65%),
            linear-gradient(170deg, #1f1b3a, #15122c);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
        }
        .front::after {
          content: "";
          position: absolute;
          inset: 6px;
          border: 1px solid var(--line);
          border-radius: 7px;
          pointer-events: none;
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
            linear-gradient(170deg, #2b1f07, #1a1205);
          border-color: rgba(201,162,75,0.7);
          box-shadow:
            0 0 0 1px rgba(201,162,75,0.3),
            0 10px 30px rgba(201,162,75,0.2);
        }
        .card.advanced .front::after {
          border-color: rgba(201,162,75,0.35);
        }
        .card.advanced .glyph { color: #ffe8a0; }
        .card.advanced .name  { color: #f5e6c0; }
        .card.advanced .name-en { color: rgba(245,230,192,0.55); }
        .card.advanced .numeral { color: var(--gold-bright); }

        .advanced-mark {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 8px;
          letter-spacing: 0.18em;
          color: #1c1405;
          background: linear-gradient(135deg, var(--gold-bright), var(--gold));
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 700;
          white-space: nowrap;
        }

        .score-badge {
          position: absolute;
          bottom: 9px;
          right: 9px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--gold);
          color: var(--void);
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </button>
  );
}
