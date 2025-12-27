"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

interface FlowArrowProps {
  /** Source element position */
  from: { x: number; y: number };
  /** Target element position */
  to: { x: number; y: number };
  /** Animation duration in ms */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Arrow color */
  color?: string;
}

export function FlowArrow({
  from,
  to,
  duration = 600,
  onComplete,
  color = "#ffd000",
}: FlowArrowProps) {
  const [visible, setVisible] = useState(true);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  // Calculate path
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Control point for quadratic curve (curves upward/outward)
  const midX = from.x + dx * 0.5;
  const curveOffset = Math.min(Math.abs(dx) * 0.3, 80); // Limit curve height
  const midY = from.y + dy * 0.5 - curveOffset;

  // SVG path for the curve
  const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  // Unique ID for this arrow instance
  const arrowId = useRef(`arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Start fade out after animation
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration + 400);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  const gradientId = `gradient-${arrowId.current}`;
  const glowId = `glow-${arrowId.current}`;
  const markerId = `marker-${arrowId.current}`;

  return (
    <>
      <style>{`
        @keyframes dash-${arrowId.current} {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes dot-${arrowId.current} {
          0% {
            offset-distance: 0%;
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            offset-distance: 100%;
            opacity: 0;
          }
        }
        @keyframes fade-in-${arrowId.current} {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <svg
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "visible",
        }}
      >
        <defs>
          {/* Gradient for the line */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>

          {/* Glow filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker - smaller */}
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 L2,4 Z" fill={color} />
          </marker>
        </defs>

        {/* Animated path */}
        <path
          ref={pathRef}
          d={pathD}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1000"
          markerEnd={`url(#${markerId})`}
          filter={`url(#${glowId})`}
          style={{
            animation: `dash-${arrowId.current} ${duration}ms ease-out forwards`,
          }}
        />

        {/* Moving dot that follows the path */}
        <circle
          ref={dotRef}
          r="5"
          fill={color}
          filter={`url(#${glowId})`}
          style={{
            offsetPath: `path('${pathD}')`,
            animation: `dot-${arrowId.current} ${duration}ms ease-out forwards`,
          }}
        />
      </svg>
    </>
  );
}

// ============ Arrow Manager ============

interface ArrowConfig {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
}

interface ArrowManagerContextValue {
  showArrow: (from: { x: number; y: number }, to: { x: number; y: number }, color?: string) => void;
}

const ArrowManagerContext = React.createContext<ArrowManagerContextValue | null>(null);

export function ArrowManagerProvider({ children }: { children: React.ReactNode }) {
  const [arrows, setArrows] = useState<ArrowConfig[]>([]);

  const showArrow = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }, color?: string) => {
      const id = `arrow-${Date.now()}`;
      setArrows((prev) => [...prev, { id, from, to, color }]);
    },
    []
  );

  const removeArrow = useCallback((id: string) => {
    setArrows((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <ArrowManagerContext.Provider value={{ showArrow }}>
      {children}
      {arrows.map((arrow) => (
        <FlowArrow
          key={arrow.id}
          from={arrow.from}
          to={arrow.to}
          color={arrow.color}
          onComplete={() => removeArrow(arrow.id)}
        />
      ))}
    </ArrowManagerContext.Provider>
  );
}

export function useFlowArrow() {
  const context = React.useContext(ArrowManagerContext);
  if (!context) {
    // Return a no-op if not wrapped in provider
    return {
      showArrow: () => {},
    };
  }
  return context;
}
