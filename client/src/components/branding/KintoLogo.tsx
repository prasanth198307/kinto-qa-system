interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex items-center ${isCompact ? "gap-2" : "gap-3"}`}>
        <div 
          className={`
            bg-primary rounded-md flex items-center justify-center font-bold text-white
            ${isCompact ? "px-2.5 py-1 text-base" : "px-4 py-2 text-2xl"}
          `}
          style={{ letterSpacing: '0.05em' }}
        >
          KINTO
        </div>
        <div className={`flex flex-col leading-tight ${isCompact ? "" : ""}`}>
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
