import logoAsset from "@/assets/ecoteiner-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Ecoteiner"
      width={1152}
      height={768}
      className={cn("block h-auto w-52 max-w-full shrink-0 object-contain", className)}
    />
  );
}