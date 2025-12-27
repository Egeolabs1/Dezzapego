export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 50"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradiente Neon Ciano para Rosa para o ZZ */}
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="50%" stopColor="#7B61FF" />
          <stop offset="100%" stopColor="#FF00E5" />
        </linearGradient>
        
        {/* Filtro de brilho para efeito neon */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* DE */}
      <text
        x="5"
        y="35"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="32"
        fontWeight="900"
        fill="#1F2937"
        letterSpacing="-1"
      >
        DE
      </text>

      {/* ZZ estilizado com design elétrico */}
      <g filter="url(#glow)">
        {/* Primeira letra Z com efeito elétrico */}
        <path
          d="M 50 12 L 74 12 L 74 16 L 56 30 L 74 30 L 74 35 L 50 35 L 50 31 L 68 17 L 50 17 Z"
          fill="url(#neonGradient)"
          strokeWidth="0.5"
          stroke="url(#neonGradient)"
        />
        
        {/* Conexão elétrica entre os dois Zs */}
        <path
          d="M 73 23 L 77 23"
          stroke="url(#neonGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="75" cy="23" r="1.5" fill="url(#neonGradient)" opacity="0.9" />
        
        {/* Segunda letra Z com efeito elétrico */}
        <path
          d="M 78 12 L 102 12 L 102 16 L 84 30 L 102 30 L 102 35 L 78 35 L 78 31 L 96 17 L 78 17 Z"
          fill="url(#neonGradient)"
          strokeWidth="0.5"
          stroke="url(#neonGradient)"
        />
      </g>

      {/* APEGO */}
      <text
        x="107"
        y="35"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="32"
        fontWeight="900"
        fill="#1F2937"
        letterSpacing="-1"
      >
        APEGO
      </text>
    </svg>
  );
}

export function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 50"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="50%" stopColor="#7B61FF" />
          <stop offset="100%" stopColor="#FF00E5" />
        </linearGradient>
        
        <filter id="iconGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Fundo com gradiente */}
      <rect width="50" height="50" rx="10" fill="url(#iconGradient)" opacity="0.15" />
      
      {/* ZZ estilizado para ícone */}
      <g filter="url(#iconGlow)">
        <path
          d="M 12 18 L 23 18 L 23 21 L 16 28 L 23 28 L 23 32 L 12 32 L 12 29 L 19 22 L 12 22 Z"
          fill="url(#iconGradient)"
          strokeWidth="0.5"
          stroke="url(#iconGradient)"
        />
        
        <circle cx="24.5" cy="25" r="1" fill="url(#iconGradient)" />
        
        <path
          d="M 27 18 L 38 18 L 38 21 L 31 28 L 38 28 L 38 32 L 27 32 L 27 29 L 34 22 L 27 22 Z"
          fill="url(#iconGradient)"
          strokeWidth="0.5"
          stroke="url(#iconGradient)"
        />
      </g>
    </svg>
  );
}