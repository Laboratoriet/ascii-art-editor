interface ChipButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  highlight?: boolean;
}

export default function ChipButton({ active, onClick, children, highlight }: ChipButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-2 rounded text-xs tracking-wider transition-all leading-tight ${
        active
          ? "text-amber-400 border border-amber-500/40 bg-amber-500/10"
          : highlight
            ? "text-emerald-500/60 border border-zinc-800 hover:border-emerald-500/30 bg-zinc-900"
            : "text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 bg-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}
