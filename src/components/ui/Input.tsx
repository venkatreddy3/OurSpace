import React, { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Reusable Input Component
 * Integrates error states and labels.
 */
const Input: React.FC<InputProps> = ({ label, error, className, id, ...props }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        id={id}
        className={twMerge(
          clsx(
            'w-full bg-surface-container border text-sm text-on-surface placeholder-on-surface-variant rounded-xl px-4 py-2.5 outline-none transition-all duration-200',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
              : 'border-border-gray focus:border-primary focus:ring-1 focus:ring-primary/20'
          ),
          className
        )}
        {...props}
      />
      {error && <span className="block text-xs text-red-400 font-medium">{error}</span>}
    </div>
  );
};

export default Input;
