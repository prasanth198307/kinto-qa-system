interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  const height = isCompact ? 36 : 52;
  const width = isCompact ? 140 : 200;
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex items-center ${isCompact ? "gap-2" : "gap-3"}`}>
        {/* KINTO logo with wavy bottom edge */}
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 200 52" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background with wavy bottom cuts */}
          <path
            d="M 0 0 
               L 200 0 
               L 200 40
               C 195 42, 190 45, 185 45
               C 180 45, 175 42, 170 40
               C 165 38, 160 35, 155 35
               C 150 35, 145 38, 140 40
               C 135 42, 130 45, 125 45
               C 120 45, 115 42, 110 40
               C 105 38, 100 35, 95 35
               C 90 35, 85 38, 80 40
               C 75 42, 70 45, 65 45
               C 60 45, 55 42, 50 40
               C 45 38, 40 35, 35 35
               C 30 35, 25 38, 20 40
               C 15 42, 10 45, 5 45
               C 3 45, 1 43, 0 40
               Z"
            fill="#C44D28"
          />
          
          {/* Circular swoosh element */}
          <circle cx="165" cy="22" r="12" fill="none" stroke="white" strokeWidth="3" opacity="0.8" />
          <path d="M 158 20 Q 165 15, 172 20" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
          
          {/* KINTO text */}
          <text
            x="20"
            y="28"
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            fontSize="26"
            fontWeight="700"
            fill="white"
            letterSpacing="2"
          >
            KINTO
          </text>
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
