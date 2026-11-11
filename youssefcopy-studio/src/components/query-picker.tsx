"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Native select that navigates by updating one query parameter. */
export function QueryPicker({
  param,
  label,
  value,
  options,
  placeholder,
  className,
}: {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <div className={className}>
      <label htmlFor={`picker-${param}`} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        id={`picker-${param}`}
        className="field-select min-w-64"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(search.toString());
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
