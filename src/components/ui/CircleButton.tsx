interface CircleButtonProps {
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}

export default function CircleButton({ onClick, accent, children }: CircleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
        accent
          ? "bg-zinc-800 text-amber-400 border border-zinc-700 hover:bg-zinc-700 hover:border-amber-500/30"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
