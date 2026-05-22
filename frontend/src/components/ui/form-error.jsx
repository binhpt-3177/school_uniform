import React from 'react';

/**
 * Inline form error message. Reserve the line height so showing/hiding the
 * error doesn't shift layout. Pass id and reference it from the input's
 * aria-describedby so screen readers announce the error on focus.
 */
export function FormError({ id, children }) {
  return (
    <p
      id={id}
      role={children ? 'alert' : undefined}
      className="mt-1 min-h-[1.25rem] text-xs text-red-600"
    >
      {children || ' '}
    </p>
  );
}
