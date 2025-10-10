import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import { Controller, FormProvider } from 'react-hook-form';

import { cn } from '@/lib/utils';

const Form = FormProvider;

const FormField = Controller;

const FormItemContext = React.createContext<{ id: string } | undefined>(undefined);

function useFormItemContext(component: string) {
  const context = React.useContext(FormItemContext);
  if (!context) {
    throw new Error(`${component} must be used within a FormItem`);
  }
  return context;
}

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { id } = useFormItemContext('FormLabel');

  return <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium', className)} htmlFor={id} {...props} />;
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { id } = useFormItemContext('FormControl');
    return <Slot ref={ref} id={id} aria-describedby={id ? `${id}-description ${id}-message` : undefined} {...props} />;
  },
);
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { id } = useFormItemContext('FormDescription');
    return (
      <p ref={ref} id={id ? `${id}-description` : undefined} className={cn('text-xs text-muted-foreground', className)} {...props} />
    );
  },
);
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { id } = useFormItemContext('FormMessage');

    return (
      <p
        ref={ref}
        id={id ? `${id}-message` : undefined}
        className={cn('text-xs font-medium text-red-400', className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);
FormMessage.displayName = 'FormMessage';

export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };