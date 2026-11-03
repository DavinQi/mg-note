import React from 'react';
import { AvatarId, AvatarShape, SHAPES } from '../types/settings';
import { useSettings } from '../context/SettingsContext';

interface AvatarProps {
  id?: AvatarId;
  shape?: AvatarShape;
  size?: number;
  className?: string;
  bordered?: boolean;
  src?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  id,
  shape,
  size = 40,
  className = '',
  bordered = true,
  src,
}) => {
  const { settings } = useSettings();
  const currentId = id || settings.avatar;
  const currentShape = shape || settings.avatarShape;

  const radius = (SHAPES[currentShape] || SHAPES.circle)[1];
  const avatarSrc = src || `/assets/avatars-svg/${currentId}.svg`;

  return (
    <div
      className={`inline-block overflow-hidden relative flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxShadow: bordered
          ? '0 0 0 2px #ffffff, 0 0 0 3px var(--accent-300, #a7f3d0)'
          : 'none',
        background: 'var(--c-surface-2, #f6f7fb)',
        transition: 'border-radius 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <img
        src={avatarSrc}
        alt={currentId}
        className="w-full h-full object-cover block"
        onError={(e) => {
          // Fallback to cat if failed
          (e.currentTarget as HTMLImageElement).src = '/assets/avatars-svg/cat.svg';
        }}
      />
    </div>
  );
};
