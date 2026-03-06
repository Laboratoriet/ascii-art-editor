interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export default function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-xs uppercase tracking-wider font-medium rounded transition-all ${
        active
          ? "text-amber-400 border border-amber-500/40 bg-amber-500/5"
          : "text-zinc-500 border border-zinc-800 hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}
