import React from 'react';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface NexusLogoProps {
  size?: LogoSize;
  className?: string;
  /** Show glow ring animation */
  animated?: boolean;
}

const SIZE_MAP: Record<LogoSize, { outer: number; inner: number }> = {
  xs: { outer: 24, inner: 12 },
  sm: { outer: 32, inner: 16 },
  md: { outer: 40, inner: 20 },
  lg: { outer: 56, inner: 28 },
  xl: { outer: 72, inner: 36 },
};

export const NexusLogo: React.FC<NexusLogoProps> = ({
  size = 'md',
  className = '',
  animated = true,
}) => {
  const { outer } = SIZE_MAP[size];
  const cx = outer / 2;
  const cy = outer / 2;
  const r = outer * 0.44;

  // Hexagon points
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg
      width={outer}
      height={outer}
      viewBox={`0 0 ${outer} ${outer}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NEXUS logo"
    >
      <defs>
        <radialGradient id="nexus-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nexus-hex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="nexus-flame-grad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.9" />
        </linearGradient>
        <filter id="nexus-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={outer * 0.07} result="blur" />
        </filter>
      </defs>

      {/* Outer glow */}
      {animated && (
        <circle cx={cx} cy={cy} r={r + 2} fill="url(#nexus-glow)" filter="url(#nexus-blur)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Hex ring */}
      <polygon
        points={hexPoints}
        stroke="url(#nexus-hex-grad)"
        strokeWidth={outer * 0.055}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Inner hex fill */}
      <polygon
        points={hexPoints}
        fill="#09090b"
        opacity="0.85"
      />

      {/* Flame / spark shape */}
      <path
        d={`M${cx} ${cy + r * 0.42}
            C${cx - r * 0.18} ${cy + r * 0.15} ${cx - r * 0.28} ${cy - r * 0.1} ${cx} ${cy - r * 0.44}
            C${cx + r * 0.14} ${cy - r * 0.18} ${cx + r * 0.22} ${cy - r * 0.04} ${cx + r * 0.1} ${cy + r * 0.18}
            C${cx + r * 0.26} ${cy + r * 0.05} ${cx + r * 0.28} ${cy - r * 0.12} ${cx + r * 0.16} ${cy - r * 0.3}
            C${cx + r * 0.38} ${cy - r * 0.06} ${cx + r * 0.3} ${cy + r * 0.28} ${cx} ${cy + r * 0.42}Z`}
        fill="url(#nexus-flame-grad)"
        opacity="0.92"
      />
    </svg>
  );
};
