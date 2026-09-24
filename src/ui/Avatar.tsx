import { avatarById } from '@/core/avatars';

/** The explorer's avatar inside a little space helmet. */
export function AvatarBadge({ avatar, size = 56, ring = true }: { avatar: string; size?: number; ring?: boolean }) {
  const a = avatarById(avatar);
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${a.color}33 38%, ${a.color}88 100%)`,
        boxShadow: ring
          ? `inset 0 -${size * 0.06}px 0 ${a.color}, inset 0 0 0 ${Math.max(2, size * 0.05)}px rgba(255,255,255,0.85), 0 6px 16px rgba(0,0,0,0.3)`
          : undefined,
      }}
    >
      <span className="emoji" style={{ fontSize: size * 0.56, transform: 'translateY(4%)' }}>
        {a.emoji}
      </span>
      <span
        style={{
          position: 'absolute',
          top: '12%',
          left: '18%',
          width: '26%',
          height: '16%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.75)',
          transform: 'rotate(-30deg)',
          filter: 'blur(0.5px)',
        }}
      />
    </span>
  );
}
