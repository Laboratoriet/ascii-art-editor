"use client";

import ControlContent, { ControlContentProps } from "@/components/ControlContent";
import CircleButton from "@/components/ui/CircleButton";

type ControlPanelProps = ControlContentProps;

export default function ControlPanel(props: ControlPanelProps) {
  return (
    <div className="flex flex-col h-full" data-no-drag>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto controls-scroll p-5">
        <ControlContent {...props} />
      </div>

      {/* Bottom action buttons */}
      <div className="p-4 border-t border-zinc-800/60 flex gap-3">
        <CircleButton onClick={props.onRandom}>RANDOM</CircleButton>
        <CircleButton onClick={props.onExport} accent>EXPORT</CircleButton>
      </div>
    </div>
  );
}
