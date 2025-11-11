import kintoLogoImg from "@assets/kinto-logo.png";

interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
  layout?: "horizontal" | "vertical";
}

export function KintoLogo({ className = "", variant = "full", layout = "horizontal" }: KintoLogoProps) {
  const isCompact = variant === "compact";
  const isVertical = layout === "vertical";
  
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-kinto">
      <div className={`inline-flex ${isVertical ? "flex-col items-center gap-1" : "items-center"} ${isCompact ? "gap-2" : "gap-3"}`}>
        <img
          src={kintoLogoImg}
          alt="KINTO"
          className={`${isCompact ? "h-6" : "h-9"} w-auto object-contain`}
        />
        <div className={`flex flex-col leading-tight ${isVertical ? "items-center" : ""}`}>
          <span className={`text-foreground font-bold tracking-tight ${isCompact ? "text-xs" : "text-sm"} ${isVertical ? "text-center" : ""}`}>
            SmartOps
          </span>
          <span className={`text-muted-foreground font-medium ${isCompact ? "text-[9px]" : "text-[10px]"} ${isVertical ? "text-center" : ""}`}>
            Manufacturing Excellence
          </span>
        </div>
      </div>
    </div>
  );
}
