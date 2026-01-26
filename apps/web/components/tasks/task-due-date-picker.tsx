'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TaskDueDatePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  ariaLabel?: string;
}

function toLocalDay(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  const date = new Date(parsed);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toStartOfDayIso(date: Date): string {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

function formatDate(value?: Date): string {
  if (!value) {
    return 'Select due date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export function TaskDueDatePicker({ value, onChange, placeholder = 'Select due date', ariaLabel }: TaskDueDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => toLocalDay(value), [value]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          type="button"
          aria-label={ariaLabel ?? placeholder}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4" aria-hidden />
            {selectedDate ? formatDate(selectedDate) : placeholder}
          </span>
          {selectedDate ? <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }
            onChange(toStartOfDayIso(date));
            setOpen(false);
          }}
          initialFocus
        />
        <div className="flex items-center justify-between border-t border-border/60 p-3 text-xs text-muted-foreground">
          <span>{selectedDate ? 'Due date selected' : 'No due date selected'}</span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
