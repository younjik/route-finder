const DEFAULT_CRYSTALS = [
  { id: 0, left: "6%", top: "12%", size: 26, delay: "0s", color: "#e879f9" },
  { id: 1, left: "88%", top: "8%", size: 20, delay: "1.2s", color: "#c084fc" },
  { id: 2, left: "4%", top: "78%", size: 22, delay: "2.1s", color: "#f0abfc" },
  { id: 3, left: "90%", top: "70%", size: 28, delay: "0.7s", color: "#d8b4fe" },
  { id: 4, left: "92%", top: "40%", size: 16, delay: "1.8s", color: "#f5d0fe" },
];

function CrystalShard({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 20 26" style={{ filter: `drop-shadow(0 0 6px ${color}99)` }}>
      <polygon points="10,0 18,8 14,26 6,26 2,8" fill={color} opacity="0.55" />
      <polygon points="10,0 18,8 10,12 2,8" fill={color} opacity="0.85" />
    </svg>
  );
}

export default function CrystalField({ crystals = DEFAULT_CRYSTALS }: { crystals?: typeof DEFAULT_CRYSTALS }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      {crystals.map((c) => (
        <div
          key={c.id}
          className="crystal-shard absolute"
          style={{ left: c.left, top: c.top, animationDelay: c.delay }}
        >
          <CrystalShard size={c.size} color={c.color} />
        </div>
      ))}
    </div>
  );
}
