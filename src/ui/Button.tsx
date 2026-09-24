import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { playSfx } from '@/core/audio/sfx';
import type { SfxName } from '@/core/types';
import styles from './Button.module.css';

export type ButtonTone = 'sun' | 'grape' | 'mint' | 'coral' | 'sky' | 'leaf' | 'paper' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: 's' | 'm' | 'l' | 'xl';
  icon?: ReactNode;
  round?: boolean;
  block?: boolean;
  /** Sound on press; `null` for silent. */
  sound?: SfxName | null;
}

export function Button({
  tone = 'grape',
  size = 'm',
  icon,
  round,
  block,
  sound = 'tap',
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[tone],
    size !== 'm' ? styles[size] : '',
    round ? styles.round : '',
    block ? styles.block : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={cls}
      onClick={(e) => {
        if (sound) playSfx(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon !== undefined && (
        <span className={`${styles.icon} emoji`} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
