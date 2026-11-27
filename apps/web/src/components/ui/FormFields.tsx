'use client';

import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface BaseFieldProps {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  charCount?: { current: number; max: number };
}

const baseControlClass =
  'w-full rounded-[8px] border bg-[var(--bg-surface)] px-3 py-2.5 text-[16px] md:text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-muted)]';

function FieldWrapper({
  id,
  label,
  helperText,
  error,
  required,
  charCount,
  children,
}: BaseFieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[14px] font-medium text-[var(--text-primary)]"
        >
          {label}
          {required && (
            <span className="ml-1 text-[var(--status-danger-text)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {charCount && (
          <span className="tabular-nums text-[12px] text-[var(--text-muted)]">
            {charCount.current}/{charCount.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-[var(--status-danger-text)]" role="alert">
          {error}
        </p>
      ) : (
        helperText && (
          <p className="text-[12px] text-[var(--text-muted)]">{helperText}</p>
        )
      )}
    </div>
  );
}

export interface InputProps
  extends BaseFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string;
}

export function Input({
  id,
  label,
  helperText,
  error,
  required,
  charCount,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
      charCount={charCount}
    >
      <input
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(
          baseControlClass,
          'min-h-[44px] md:min-h-[40px]',
          error
            ? 'border-[var(--status-danger-text)] focus:ring-[var(--status-danger-text)]'
            : 'border-[var(--border-strong)]',
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
}

export interface TextareaProps
  extends BaseFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id?: string;
}

export function Textarea({
  id,
  label,
  helperText,
  error,
  required,
  charCount,
  className,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
      charCount={charCount}
    >
      <textarea
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(
          baseControlClass,
          'min-h-[96px] resize-y leading-relaxed',
          error
            ? 'border-[var(--status-danger-text)] focus:ring-[var(--status-danger-text)]'
            : 'border-[var(--border-strong)]',
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
}

export interface SelectProps
  extends BaseFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id?: string;
}

export function Select({
  id,
  label,
  helperText,
  error,
  required,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
    >
      <select
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(
          baseControlClass,
          'min-h-[44px] md:min-h-[40px]',
          error
            ? 'border-[var(--status-danger-text)] focus:ring-[var(--status-danger-text)]'
            : 'border-[var(--border-strong)]',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
