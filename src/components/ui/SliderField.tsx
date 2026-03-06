interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  accent?: boolean;
}

export default function SliderField({
  label, value, min, max, step, display, onChange, accent,
}: SliderFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs uppercase tracking-[0.1em] ${accent ? "text-amber-400/70" : "text-zinc-500"}`}>
          {label}
        </span>
        <span className="text-xs text-zinc-400 font-mono tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent ? "accent-slider" : ""}`}
      />
    </div>
  );
}
