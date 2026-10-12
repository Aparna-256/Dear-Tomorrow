export const VintageMailboxIllustration = () => {
  return (
    <div className="hero-art-container" aria-label="Illustration of a magical vintage envelope and celestial postbox">
      <div className="vintage-art-card">
        <span className="floating-wings left" aria-hidden="true">୨୧</span>
        <span className="floating-wings right" aria-hidden="true">☾</span>

        <div className="envelope-svg-wrap">
          <svg viewBox="0 0 320 220" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5EBDD" />
                <stop offset="50%" stopColor="#EAD8C1" />
                <stop offset="100%" stopColor="#DCC7A5" />
              </linearGradient>

              <linearGradient id="flapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FBF4EA" />
                <stop offset="100%" stopColor="#DFCEB6" />
              </linearGradient>

              <radialGradient id="waxGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#A83922" />
                <stop offset="70%" stopColor="#7A2816" />
                <stop offset="100%" stopColor="#4D150B" />
              </radialGradient>

              <filter id="envelopeShadow" x="-10%" y="-10%" width="125%" height="135%">
                <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2A170F" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Glowing background halo */}
            <circle cx="160" cy="110" r="95" fill="#E8C581" fillOpacity="0.12" filter="blur(20px)" />

            {/* Main Envelope Body */}
            <rect
              x="30"
              y="40"
              width="260"
              height="160"
              rx="14"
              fill="url(#envelopeGrad)"
              stroke="#B58B62"
              strokeWidth="2.5"
              filter="url(#envelopeShadow)"
            />

            {/* Air Mail Border Pattern */}
            <g stroke="#8C2D19" strokeWidth="2" opacity="0.35">
              <line x1="38" y1="46" x2="54" y2="46" strokeDasharray="4 4" />
              <line x1="266" y1="46" x2="282" y2="46" strokeDasharray="4 4" />
            </g>

            {/* Vintage Stamp */}
            <g transform="translate(230, 52)">
              <rect x="0" y="0" width="46" height="52" rx="4" fill="#FFF9F0" stroke="#6B4938" strokeWidth="1.5" strokeDasharray="2 2" />
              <circle cx="23" cy="24" r="14" fill="#EAD8C1" />
              <text x="23" y="29" fontSize="16" textAnchor="middle" fill="#6B4938">☾</text>
              <text x="23" y="47" fontSize="7" textAnchor="middle" fill="#4A3026" fontFamily="serif" letterSpacing="1">TIME</text>
            </g>

            {/* Postal Circular Cancellation Postmark */}
            <g transform="translate(210, 75)" opacity="0.6">
              <circle cx="20" cy="20" r="22" stroke="#4A3026" strokeWidth="1.2" fill="none" strokeDasharray="5 2" />
              <text x="20" y="16" fontSize="7" textAnchor="middle" fill="#4A3026" letterSpacing="1">DEAR TOMORROW</text>
              <text x="20" y="27" fontSize="8" textAnchor="middle" fill="#4A3026" fontWeight="bold">✦ 1889-2026 ✦</text>
              <line x1="-12" y1="20" x2="-2" y2="20" stroke="#4A3026" strokeWidth="1.5" />
              <line x1="-16" y1="14" x2="-2" y2="14" stroke="#4A3026" strokeWidth="1.5" />
              <line x1="-14" y1="26" x2="-2" y2="26" stroke="#4A3026" strokeWidth="1.5" />
            </g>

            {/* Folded Envelope Flap Lines */}
            <path d="M30 40 L160 135 L290 40" stroke="#B58B62" strokeWidth="2" fill="none" opacity="0.75" />
            <path d="M30 200 L120 120" stroke="#B58B62" strokeWidth="1.8" opacity="0.5" />
            <path d="M290 200 L200 120" stroke="#B58B62" strokeWidth="1.8" opacity="0.5" />

            {/* Envelope Top Triangular Flap */}
            <path d="M32 42 L160 125 L288 42 Z" fill="url(#flapGrad)" stroke="#B58B62" strokeWidth="1" opacity="0.85" />

            {/* Wax Seal Centered */}
            <g transform="translate(160, 125)">
              <circle cx="0" cy="0" r="25" fill="url(#waxGrad)" stroke="#DCC7A5" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="21" fill="none" stroke="#DCC7A5" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
              <text x="0" y="6" fontSize="13" textAnchor="middle" fill="#FFF9F0" fontWeight="bold" fontFamily="serif" letterSpacing="1">DT</text>
              {/* Wax droplets */}
              <circle cx="-16" cy="18" r="4.5" fill="#7A2816" />
              <circle cx="18" cy="14" r="3.5" fill="#7A2816" />
            </g>

            {/* Whimsical Quill Feather crossing gracefully */}
            <g transform="translate(85, 20) rotate(-22)">
              {/* Feather quill spine */}
              <path d="M0 0 Q 30 -50 90 -120" stroke="#4A3026" strokeWidth="2" fill="none" />
              {/* Quill vane */}
              <path d="M0 0 Q 25 -30 40 -80 Q 20 -90 0 0" fill="#EAD8C1" stroke="#B58B62" strokeWidth="1" opacity="0.9" />
              <path d="M0 0 Q 35 -20 60 -75 Q 40 -85 0 0" fill="#FFF9F0" opacity="0.6" />
              {/* Gold nib */}
              <polygon points="0,0 -4,12 0,16 4,12" fill="#E8C581" stroke="#6B4938" strokeWidth="1" />
            </g>

            {/* Floating Sparkles & Little Stars */}
            <g fill="#E8C581">
              <text x="50" y="30" fontSize="16">✧</text>
              <text x="270" y="32" fontSize="18">⋆｡°✩</text>
              <text x="32" y="160" fontSize="14">✦</text>
              <text x="282" y="180" fontSize="14">✧</text>
              <text x="145" y="24" fontSize="12">⋆</text>
            </g>
          </svg>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '13px', color: '#DCC7A5', letterSpacing: '2px', textTransform: 'uppercase' }}>
            ⋆｡°✩ Time-Capsule Vault ✩°｡⋆
          </span>
        </div>
      </div>
    </div>
  );
};
