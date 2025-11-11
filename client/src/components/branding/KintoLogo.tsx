import kintoLogoImg from "@assets/kinto-logo.png";

interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex items-center ${isCompact ? "gap-2" : "gap-3"}`}>
        <img
          src={kintoLogoImg}
          alt="KINTO"
          className={`${isCompact ? "h-7" : "h-10"} w-auto object-contain`}
        />
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
