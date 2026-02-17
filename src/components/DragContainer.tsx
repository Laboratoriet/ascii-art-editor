"use client";

import { ReactNode } from "react";
import { useDrag } from "@/hooks/useDrag";

interface DragContainerProps {
  children: ReactNode;
}

export default function DragContainer({ children }: DragContainerProps) {
  const { position, isDragging, handlers, reset } = useDrag();

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{ cursor: "crosshair" }}
      {...handlers}
      onDoubleClick={reset}
    >
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
