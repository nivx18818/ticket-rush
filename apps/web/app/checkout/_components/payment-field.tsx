import { Input } from '@repo/design-system/components/ui/input';

interface PaymentFieldProps {
  label: string;
  value: string;
}

export function PaymentField({ label, value }: PaymentFieldProps) {
  const id = `checkout-${label.toLowerCase().replace(/\W+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-muted-foreground text-xs leading-5 font-medium" htmlFor={id}>
        {label}
      </label>
      <Input id={id} readOnly aria-readonly value={value} />
    </div>
  );
}
