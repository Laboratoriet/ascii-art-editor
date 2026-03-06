"use client";

import { ReactNode } from "react";
import { useDrag } from "@/hooks/useDrag";

interface DragContainerProps {
  children: ReactNode;
  zoom?: number;
}

export default function DragContainer({ children, zoom = 1 }: DragContainerProps) {
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
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
