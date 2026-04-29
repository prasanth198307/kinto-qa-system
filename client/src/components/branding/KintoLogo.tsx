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
          src="/swacherp-logo.png"
          alt="SwachERP"
          className={`${isCompact ? "h-8" : "h-16"} w-auto object-contain`}
        />
        {!isCompact && (
          <div className={`flex flex-col leading-tight ${isVertical ? "items-center" : ""}`}>
            <span className={`text-muted-foreground font-medium text-[10px] ${isVertical ? "text-center" : ""}`}>
              Cleaner Business. Better Future.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
