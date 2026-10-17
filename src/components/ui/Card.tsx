import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

/**
 * Reusable Card Component
 * Provides default glassmorphic border styles and content spacing.
 */
const Card: React.FC<CardProps> = ({ children, className, hoverEffect = false, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-surface-container border border-border-gray p-6 rounded-2xl transition-all duration-300',
          hoverEffect && 'hover:border-border-gray hover:y-[-2px] hover:shadow-lg hover:shadow-black/10',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
