'use client';

import { useEffect, useMemo, useState, type ComponentPropsWithoutRef, type KeyboardEvent } from 'react';
import { Filter, Tag, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { sanitizeTags } from '@/lib/task-tags';

interface TaskTagSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  availableTags?: string[];
  placeholder?: string;
  emptyHint?: string;
  ariaLabel?: string;
}

type CommandInputProps = ComponentPropsWithoutRef<typeof CommandInput>;

interface CommandInputWithCreateProps
  extends Omit<CommandInputProps, 'value' | 'onValueChange' | 'onKeyDown'> {
  value: string;
  onValueChange: (value: string) => void;
  canCreate: boolean;
  onCreate: () => void;
  onKeyDown?: CommandInputProps['onKeyDown'];
}

function CommandInputWithCreate({ value, onValueChange, canCreate, onCreate, onKeyDown, ...props }: CommandInputWithCreateProps) {
  return (
    <CommandInput
      {...props}
      value={value}
      onValueChange={onValueChange}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && canCreate) {
          event.preventDefault();
          onCreate();
          return;
        }

        onKeyDown?.(event);
      }}
    />
  );
}

export function TaskTagSelector({
  value,
  onChange,
  availableTags = [],
  placeholder = 'Select tags',
  emptyHint = 'Use tags to organize related work.',
  ariaLabel,
}: TaskTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');

  const normalizedSelected = useMemo(() => value.map((tag) => tag.toLowerCase()), [value]);
  const options = useMemo(() => sanitizeTags([...availableTags, ...value]), [availableTags, value]);
  const filteredOptions = useMemo(() => {
    if (!debouncedInput.trim()) {
      return options;
    }

    const search = debouncedInput.trim().toLowerCase();
    return options.filter((tag) => tag.toLowerCase().includes(search));
  }, [debouncedInput, options]);
  const canCreateTag = useMemo(() => {
    const search = inputValue.trim().toLowerCase();
    if (!search) {
      return false;
    }

    return !options.some((tag) => tag.toLowerCase() === search);
  }, [inputValue, options]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedInput(inputValue);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  const buttonLabel =
    value.length > 0 ? `${value.length} tag${value.length === 1 ? '' : 's'} selected` : placeholder;

  function toggleTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) {
      return;
    }

    const key = trimmed.toLowerCase();
    if (normalizedSelected.includes(key)) {
      onChange(value.filter((existing) => existing.toLowerCase() !== key));
    } else {
      onChange(sanitizeTags([...value, trimmed]));
    }

    setInputValue('');
  }

  function handleCreateTag() {
    if (!canCreateTag) {
      return;
    }

    toggleTag(inputValue);
    setOpen(false);
  }

  function handleRemoveTag(tag: string) {
    const key = tag.toLowerCase();
    onChange(value.filter((existing) => existing.toLowerCase() !== key));
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Backspace' || inputValue.length > 0 || value.length === 0) {
      return;
    }

    event.preventDefault();
    onChange(value.slice(0, -1));
  }

  function isTagSelected(tag: string) {
    return normalizedSelected.includes(tag.toLowerCase());
  }

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setInputValue('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            aria-expanded={open}
            aria-label={ariaLabel ?? placeholder}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4" aria-hidden />
              {buttonLabel}
            </span>
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInputWithCreate
              value={inputValue}
              onValueChange={setInputValue}
              placeholder="Search or create tags"
              aria-label="Search available tags"
              canCreate={canCreateTag}
              onCreate={handleCreateTag}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                <div className="space-y-2">
                  <p>No tags found.</p>
                  {canCreateTag ? (
                    <Button variant="secondary" size="sm" className="w-full" type="button" onClick={handleCreateTag}>
                      Create “{inputValue.trim()}”
                    </Button>
                  ) : null}
                </div>
              </CommandEmpty>
              <CommandGroup heading="Tags">
                {filteredOptions.map((tag) => (
                  <CommandItem key={tag} value={tag} onSelect={(value) => toggleTag(value)} aria-checked={isTagSelected(tag)}>
                    <span className="flex-1 text-sm capitalize">{tag}</span>
                    {isTagSelected(tag) ? <span className="text-xs text-primary">Selected</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-live="polite" aria-label="Selected tags">
          {value.map((tag) => (
            <Badge key={tag.toLowerCase()} variant="outline" className="flex items-center gap-1 capitalize">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
}
