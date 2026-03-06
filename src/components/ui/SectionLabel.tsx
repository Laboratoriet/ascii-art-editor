interface SectionLabelProps {
  children: React.ReactNode;
}

export default function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-medium mb-1.5">
      {children}
    </p>
  );
}
