"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface SectionBoxProps {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export default function SectionBox({
  label,
  children,
  collapsible = false,
  defaultExpanded = true,
}: SectionBoxProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-zinc-800/60 rounded p-3">
      <button
        type="button"
        onClick={collapsible ? () => setExpanded(!expanded) : undefined}
        className={`flex items-center justify-between w-full ${
          collapsible ? "cursor-pointer" : "cursor-default"
        } ${expanded && collapsible ? "mb-2.5" : !collapsible ? "mb-2.5" : ""}`}
      >
        <span className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-medium">
          {label}
        </span>
        {collapsible && (
          <ChevronDown
            size={14}
            className={`text-zinc-600 transition-transform duration-200 ${
              expanded ? "rotate-0" : "-rotate-90"
            }`}
          />
        )}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
