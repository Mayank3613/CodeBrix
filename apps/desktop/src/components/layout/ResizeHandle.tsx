import { useCallback, useRef, useEffect, useState } from "react";

interface ResizeHandleProps {
  /** Direction the handle controls: col-resize or row-resize */
  direction: "horizontal" | "vertical";
  /** Which side of the panel the handle sits on */
  side: "right" | "left" | "top";
  /** Callback with the delta in pixels while dragging */
  onResize: (delta: number) => void;
  /** Optional: called when drag starts */
  onResizeStart?: () => void;
  /** Optional: called when drag ends */
  onResizeEnd?: () => void;
}

export default function ResizeHandle({
  direction,
  side,
  onResize,
  onResizeStart,
  onResizeEnd,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      startPos.current = direction === "horizontal" ? e.clientX : e.clientY;

      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      onResizeStart?.();
    },
    [direction, onResizeStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const current = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = current - startPos.current;
      startPos.current = current;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEnd?.();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, direction, onResize, onResizeEnd]);

  const positionClass =
    side === "right"
      ? "cb-resize-handle--right"
      : side === "left"
      ? "cb-resize-handle--left"
      : "cb-resize-handle--top";

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`cb-resize-handle ${positionClass} ${
        isDragging ? "cb-resize-handle--active" : ""
      }`}
    />
  );
}
