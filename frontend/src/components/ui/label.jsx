import React from 'react';

/**
 * Styled <label>. Always pass htmlFor and pair with an Input of matching id
 * to keep the form accessible.
 */
export function Label({ htmlFor, className = '', children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-slate-700 ${className}`}
    >
      {children}
    </label>
  );
}
