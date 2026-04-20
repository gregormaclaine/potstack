import { getAvatar, DEFAULT_AVATAR_SVG } from "@/lib/avatars";
import { clsx } from "clsx";

const SIZE_PX: Record<string, number> = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 64,
};

interface UserAvatarProps {
  avatarId?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export default function UserAvatar({ avatarId, size = "sm", className }: UserAvatarProps) {
  const px = SIZE_PX[size];
  const avatar = getAvatar(avatarId);
  const svgContent = avatar ? avatar.svg : DEFAULT_AVATAR_SVG;

  return (
    <svg
      viewBox="0 0 76 76"
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      className={clsx("rounded-full shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
