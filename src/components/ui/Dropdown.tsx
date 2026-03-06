interface DropdownProps<T extends string> {
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
}

export default function Dropdown<T extends string>({ value, options, onChange }: DropdownProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-zinc-900 text-zinc-300 rounded px-3 py-2.5 text-xs border border-zinc-800 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
    >
      {(Object.entries(options) as [T, string][]).map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  );
}
