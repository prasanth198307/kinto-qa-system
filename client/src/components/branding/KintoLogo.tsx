interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  const height = isCompact ? 36 : 50;
  const width = isCompact ? 130 : 180;
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex items-center ${isCompact ? "gap-2" : "gap-3"}`}>
        {/* KINTO logo with custom wavy letters */}
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 180 50" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Orange background */}
          <rect x="0" y="0" width="180" height="50" fill="#C44D28" rx="4" />
          
          {/* K - with wavy cuts */}
          <path d="M 10 10 L 10 40 L 15 40 L 15 26 Q 18 24 21 26 L 28 40 L 34 40 L 25 24 Q 24 23 24 22 Q 24 21 25 20 L 34 10 L 28 10 L 21 21 Q 18 23 15 21 L 15 10 Z" fill="white" />
          
          {/* I - with wavy cuts */}
          <path d="M 40 10 L 40 40 L 45 40 L 45 10 Z M 42.5 15 Q 44 16 45 15 M 42.5 30 Q 44 31 45 30" fill="white" />
          
          {/* N - with wavy cuts */}
          <path d="M 54 10 L 54 40 L 59 40 L 59 22 Q 60 20 62 20 L 72 40 L 77 40 L 77 10 L 72 10 L 72 28 Q 71 30 69 30 L 59 10 Z M 56 18 Q 58 19 59 18" fill="white" />
          
          {/* T - with wavy cuts */}
          <path d="M 88 10 L 88 15 L 98 15 Q 99 16 98 17 L 98 40 L 103 40 L 103 17 Q 102 16 103 15 L 113 15 L 113 10 Z" fill="white" />
          
          {/* O - with wavy circular cuts and swoosh */}
          <g>
            <circle cx="133" cy="25" r="13" fill="white" />
            <circle cx="133" cy="25" r="8" fill="#C44D28" />
            <path d="M 126 23 Q 130 20 134 23" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="150" cy="25" r="10" fill="none" stroke="white" strokeWidth="2.5" opacity="0.7" />
            <path d="M 144 23 Q 150 19 156 23" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          </g>
        </svg>
        
        <div className={`flex flex-col leading-tight`}>
          <span className={`text-foreground font-bold tracking-tight ${isCompact ? "text-sm" : "text-lg"}`}>
            SmartOps
          </span>
          <span className={`text-muted-foreground font-medium ${isCompact ? "text-[10px]" : "text-xs"}`}>
            Manufacturing Excellence
          </span>
        </div>
      </div>
    </div>
  );
}
