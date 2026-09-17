import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hiba?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hiba, id, className = "", ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hibaId = hiba ? `${fieldId}-hiba` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={hiba ? true : undefined}
        aria-describedby={hibaId}
        className={`min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
        {...props}
      />
      {hiba ? (
        <p id={hibaId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {hiba}
        </p>
      ) : null}
    </div>
  );
});
