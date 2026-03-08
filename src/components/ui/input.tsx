'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label htmlFor={props.name} className="label-field">{label}</label>}
    <input ref={ref} id={props.name} className={cn('input-field', error && 'input-error', className)} {...props} />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
));
Input.displayName = 'Input';
