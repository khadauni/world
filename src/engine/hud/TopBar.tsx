import { useApp } from '@/core/store';
import { stopSpeaking } from '@/core/audio/speech';
import { AvatarBadge } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { StarIcon } from '@/ui/Stars';
import styles from './Hud.module.css';

export function TopBar({
  emoji,
  title,
  stars,
  maxStars,
  avatar,
  onHome,
}: {
  emoji: string;
  title: string;
  stars: number;
  maxStars: number;
  avatar: string;
  onHome: () => void;
}) {
  const sound = useApp((s) => s.settings.sound);
  const narration = useApp((s) => s.settings.narration);
  const update = useApp((s) => s.updateSettings);

  return (
    <header className={styles.top}>
      <Button tone="ghost" round onClick={onHome} aria-label="Back to all worlds" icon="🏠" data-testid="home-button" />
      <h1 className={styles.title}>
        <span className="emoji" aria-hidden="true">
          {emoji}
        </span>
        <span>{title}</span>
      </h1>
      <span className={styles.pill} aria-label={`${stars} of ${maxStars} stars collected`}>
        <span style={{ width: 24, height: 24, display: 'inline-block' }} aria-hidden="true">
          <StarIcon filled />
        </span>
        <span aria-hidden="true">
          {stars}/{maxStars}
        </span>
      </span>
      <Button
        tone="ghost"
        round
        aria-label={narration ? 'Turn voice off' : 'Turn voice on'}
        aria-pressed={narration}
        onClick={() => {
          if (narration) stopSpeaking();
          update({ narration: !narration });
        }}
        icon={narration ? '🗣️' : '🤫'}
      />
      <Button
        tone="ghost"
        round
        aria-label={sound ? 'Turn sounds off' : 'Turn sounds on'}
        aria-pressed={sound}
        sound={sound ? null : 'tap'}
        onClick={() => update({ sound: !sound })}
        icon={sound ? '🔊' : '🔇'}
      />
      <AvatarBadge avatar={avatar} size={44} />
    </header>
  );
}
