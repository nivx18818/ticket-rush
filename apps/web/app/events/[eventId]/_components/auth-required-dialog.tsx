'use client';

import { buttonVariants } from '@repo/design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { cn } from '@repo/design-system/lib/utils';

type AuthRequiredDialogProps = {
  eventId: string;
  onOpenChangeAction: (open: boolean) => void;
  open: boolean;
  returnTo?: string;
};

export function AuthRequiredDialog({
  eventId,
  onOpenChangeAction,
  open,
  returnTo = `/events/${eventId}`,
}: AuthRequiredDialogProps) {
  const loginHref = `/login?${new URLSearchParams({ returnTo }).toString()}`;
  const registerHref = `/register?${new URLSearchParams({ returnTo }).toString()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Log in to continue</DialogTitle>
          <DialogDescription>
            Your seats are attached to your account so checkout can hold them safely.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-background">
          <a className={cn(buttonVariants({ variant: 'outline' }))} href={registerHref}>
            Create account
          </a>
          <a className={cn(buttonVariants())} href={loginHref}>
            Log in
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
