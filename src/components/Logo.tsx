import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export const LogoIcon: React.FC<{ size?: number | string; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md ${className}`}
      aria-label="Bayburt Özka Logo"
    >
      {/* Dark Navy / Indigo Circle Background */}
      <circle cx="50" cy="78" r="42" fill="#18153d" />

      {/* Skyscraper Towers Top (Rising above circle) */}
      {/* Left Tower */}
      <path
        d="M40 52V22L48 12V52H40Z"
        fill="#538ef8"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Right Tower */}
      <path
        d="M52 52V12L60 22V52H52Z"
        fill="#437de6"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Center Top Roof Gable Triangle / Chevron connecting towers */}
      <path
        d="M50 44L40 54H60L50 44Z"
        fill="#ffffff"
      />

      {/* Outer Chevron Roof Layer */}
      <path
        d="M50 48L22 72V82L50 58L78 82V72L50 48Z"
        fill="#ffffff"
      />
      <path
        d="M50 52L25 74V80L50 58L75 80V74L50 52Z"
        fill="#538ef8"
      />

      {/* Middle Chevron Roof & Pillars */}
      <path
        d="M50 62L30 79V106H38V84L50 74L62 84V106H70V79L50 62Z"
        fill="#ffffff"
      />
      <path
        d="M50 66L33 81V104H36V83L50 72L64 83V104H67V81L50 66Z"
        fill="#538ef8"
      />

      {/* Inner Portal / Central Pointed Arch Doorway */}
      <path
        d="M50 76L40 85V106H60V85L50 76Z"
        fill="#ffffff"
      />
      <path
        d="M50 80L43 87V106H57V87L50 80Z"
        fill="#538ef8"
      />

      {/* Bottom Foundation Cutouts for 3D depth */}
      <rect x="47" y="94" width="6" height="12" fill="#18153d" rx="1" />
    </svg>
  );
};

export const BrandLogo: React.FC<LogoProps> = ({
  className = '',
  size = 42,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative p-1 rounded-2xl bg-gradient-to-b from-blue-900/40 to-[#071329] border border-blue-500/30 shadow-lg shadow-blue-950/60 flex items-center justify-center">
        <LogoIcon size={size} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
            İNŞAAT & TAAHHÜT
          </span>
          <span className="text-sm font-black text-white tracking-wide leading-tight">
            BAYBURT ÖZKA
          </span>
        </div>
      )}
    </div>
  );
};
