interface InfoRowProps {
  label: string;
  value: string;
}

export default function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-zinc-600 tracking-wider font-medium">{label}</span>
      <span className="text-xs text-zinc-400 tracking-wider font-medium">{value}</span>
    </div>
  );
}
