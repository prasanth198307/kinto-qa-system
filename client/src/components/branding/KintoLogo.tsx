interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  const height = isCompact ? 32 : 48;
  const width = isCompact ? 120 : 160;
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex items-center ${isCompact ? "gap-2" : "gap-3"}`}>
        {/* KINTO logo with wave cuts */}
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 160 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background with wave cuts */}
          <path
            d="M 8 0 
               L 152 0 
               C 156.418 0 160 3.582 160 8 
               L 160 40 
               C 160 44.418 156.418 48 152 48 
               L 8 48 
               C 3.582 48 0 44.418 0 40 
               L 0 8 
               C 0 3.582 3.582 0 8 0 Z
               
               M 40 0
               Q 40 8 48 8
               Q 40 8 40 16
               
               M 80 0
               Q 80 8 88 8
               Q 80 8 80 16
               
               M 120 0
               Q 120 8 128 8
               Q 120 8 120 16"
            fill="#FF5C28"
            fillRule="evenodd"
          />
          
          {/* KINTO text */}
          <text
            x="80"
            y="32"
            fontFamily="Segoe UI, system-ui, -apple-system, sans-serif"
            fontSize="24"
            fontWeight="700"
            fill="white"
            textAnchor="middle"
            letterSpacing="1.2"
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
