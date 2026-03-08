'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'brand' | 'danger' | 'ghost';

interface ButtonBaseProps {
  variant?: Variant;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = ButtonBaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & { href?: undefined };
type ButtonAsLink = ButtonBaseProps & { href: string; target?: string; rel?: string; download?: boolean | string; disabled?: boolean; onClick?: React.MouseEventHandler<HTMLAnchorElement> };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const cls: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  brand: 'btn-brand',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export function Button({ variant = 'primary', loading, className, children, ...props }: ButtonProps) {
  const classes = cn(cls[variant], className);

  if ('href' in props && props.href) {
    const { href, disabled, download, ...rest } = props;
    if (disabled || loading) {
      return (
        <span className={cn(classes, 'opacity-50 pointer-events-none')} {...(rest as any)}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {children}
        </span>
      );
    }
    if (download !== undefined || (rest as any).target === '_blank') {
      return (
        <a href={href} className={classes} download={download} {...(rest as any)}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...(rest as any)}>
        {children}
      </Link>
    );
  }

  const { disabled, ...buttonProps } = props as ButtonAsButton;
  return (
    <button className={classes} disabled={disabled || loading} {...buttonProps}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
