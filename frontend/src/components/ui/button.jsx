import React from 'react';

const VARIANTS = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 focus-visible:outline-blue-600',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
};

/**
 * Accessible button with three visual variants.
 * type defaults to "button" to prevent accidental form submissions when used
 * inside a <form>. Pass type="submit" explicitly for submit buttons.
 */
export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.primary;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed ${variantClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
