import React, { forwardRef } from 'react';

/**
 * Accessible text input. Forwards refs so react-hook-form's `register()` works.
 * Pass `invalid` (boolean) to switch to error styling and set aria-invalid.
 * Pair with <FormError id="..."> and pass that id via aria-describedby.
 */
export const Input = forwardRef(function Input(
  { invalid = false, className = '', type = 'text', ...rest },
  ref,
) {
  const tone = invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200';

  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={`block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-100 ${tone} ${className}`}
      {...rest}
    />
  );
});
