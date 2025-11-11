import kintoLogoImg from "@assets/kinto-logo.png";

interface KintoLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function KintoLogo({ className = "", variant = "full" }: KintoLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={kintoLogoImg}
        alt="KINTO"
        className={`${variant === "full" ? "h-12" : "h-8"} w-auto object-contain`}
        data-testid="img-kinto-logo"
      />
    </div>
  );
}
