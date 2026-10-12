import { useMemo } from 'react';

export const CelestialDust = () => {
  // Generate random static particles on mount
  const particles = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      left: `${(i * 3.1) % 100}%`,
      size: `${Math.floor(2 + (i % 5) * 1.5)}px`,
      duration: `${10 + (i % 8) * 2}s`,
      delay: `${-(i * 0.9)}s`,
      opacity: 0.2 + (i % 4) * 0.15,
    }));
  }, []);

  return (
    <div className="celestial-dust" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="dust-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};
