'use client';

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  MultiplicationSignCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        error: <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} />,
        info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />,
        loading: <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} />,
        success: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />,
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />,
      }}
      style={
        {
          '--border-radius': 'var(--radius)',
          '--normal-bg': 'var(--popover)',
          '--normal-border': 'var(--border)',
          '--normal-text': 'var(--popover-foreground)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
