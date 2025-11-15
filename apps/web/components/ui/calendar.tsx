"use client";

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button:
          'h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 border border-transparent rounded-full transition hover:bg-secondary hover:text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        nav_button_previous: 'absolute left-1 top-1',
        nav_button_next: 'absolute right-1 top-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'w-9 text-center text-xs font-medium text-muted-foreground',
        row: 'flex w-full mt-2',
        cell: cn(
          'relative h-9 w-9 text-center text-sm focus-within:relative focus-within:z-20',
          'aria-selected:rounded-full aria-selected:bg-primary aria-selected:text-primary-foreground',
        ),
        day: 'h-9 w-9 rounded-full text-sm font-normal transition hover:bg-secondary hover:text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
        day_today: 'bg-primary/10 text-primary-foreground',
        day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_outside: 'text-muted-foreground/60 aria-selected:bg-secondary aria-selected:text-secondary-foreground',
        day_disabled: 'text-muted-foreground/40',
        day_range_middle: 'aria-selected:rounded-full aria-selected:bg-primary/20 aria-selected:text-primary-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
