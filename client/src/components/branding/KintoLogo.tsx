interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex items-center gap-2 ${isCompact ? "" : "gap-3"}`}>
        <div 
          className={`
            bg-primary rounded-md flex items-center justify-center font-bold text-white
            ${isCompact ? "px-3 py-1.5 text-xl" : "px-4 py-2 text-3xl"}
          `}
          style={{ letterSpacing: '0.05em' }}
        >
          KINTO
        </div>
        {!isCompact && (
          <div className="flex flex-col leading-tight">
            <span className="text-foreground font-bold text-lg tracking-tight">SmartOps</span>
            <span className="text-muted-foreground text-xs font-medium">Manufacturing Excellence</span>
          </div>
        )}
      </div>
    </div>
  );
}
