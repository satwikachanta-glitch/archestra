import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

interface JsonArrayTextareaProps
  extends Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> {
  value?: string[];
  onChange?: (value: string[]) => void;
  onInvalid?: (isInvalid: boolean) => void;
}

export const JsonArrayTextarea = React.forwardRef<
  HTMLTextAreaElement,
  JsonArrayTextareaProps
>(({ value, onChange, onInvalid, ...props }, ref) => {
  const [localValue, setLocalValue] = useState(() => {
    return value && value.length > 0 ? JSON.stringify(value, null, 2) : "";
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only sync from outside if we don't have an error (meaning we aren't mid-edit with invalid JSON)
    if (!error) {
      const stringified =
        value && value.length > 0 ? JSON.stringify(value, null, 2) : "";
      if (stringified !== localValue) {
        setLocalValue(stringified);
      }
    }
  }, [value, error, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setLocalValue(text);

    if (!text.trim()) {
      setError(null);
      onInvalid?.(false);
      onChange?.([]);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("Must be a JSON array");
      }
      if (!parsed.every((item) => typeof item === "string")) {
        throw new Error("All items must be strings");
      }
      setError(null);
      onInvalid?.(false);
      onChange?.(parsed);
    } catch (err: any) {
      setError(err.message || "Invalid JSON format");
      onInvalid?.(true);
      // We do not call onChange with invalid data, so the form state remains whatever it was before
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={localValue}
        onChange={handleChange}
        aria-invalid={!!error}
        className={`${props.className || ""} ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
        {...props}
      />
      {error && (
        <div className="text-destructive text-sm mt-1">
          Invalid JSON: {error}
        </div>
      )}
    </div>
  );
});

JsonArrayTextarea.displayName = "JsonArrayTextarea";
