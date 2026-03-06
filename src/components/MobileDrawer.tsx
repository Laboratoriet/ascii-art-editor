"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import ControlContent, { ControlContentProps } from "@/components/ControlContent";
import CircleButton from "@/components/ui/CircleButton";

interface MobileDrawerProps extends ControlContentProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose, ...contentProps }: MobileDrawerProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[85vw] max-w-[380px] bg-black border-l border-zinc-800/50 flex flex-col transition-transform duration-300 ease-out pb-safe ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 pt-safe shrink-0">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Controls</span>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto controls-scroll px-4 pb-4">
          <ControlContent {...contentProps} isMobile defaultCollapsed />
        </div>

        {/* Bottom action buttons */}
        <div className="p-4 border-t border-zinc-800/60 flex gap-3 shrink-0 pb-safe">
          <CircleButton onClick={contentProps.onRandom}>RANDOM</CircleButton>
          <CircleButton onClick={contentProps.onExport} accent>EXPORT</CircleButton>
        </div>
      </div>
    </>
  );
}
