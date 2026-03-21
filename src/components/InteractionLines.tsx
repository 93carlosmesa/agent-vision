/**
 * InteractionLines — SVG overlay drawing animated connection lines
 * between interacting agents.
 *
 * Uses the positioned agent map to look up coordinates, then draws
 * bezier curves with animated dashes and floating labels.
 */

import { useMemo } from 'react';
import type { IInteraction } from '../types';
import { INTERACTION_COLORS } from '../types';

interface Position {
  left: string;
  top: string;
}

interface InteractionLinesProps {
  interactions: IInteraction[];
  /** Map of sessionKey → { left: '45%', top: '30%' } */
  positionMap: Record<string, Position>;
}

function parsePercent(val: string): number {
  return parseFloat(val);
}

export function InteractionLines({ interactions, positionMap }: InteractionLinesProps) {
  const lines = useMemo(() => {
    return interactions
      .map((interaction) => {
        const from = positionMap[interaction.fromSessionKey];
        const to = positionMap[interaction.toSessionKey];
        if (!from || !to) return null;

        const x1 = parsePercent(from.left);
        const y1 = parsePercent(from.top);
        const x2 = parsePercent(to.left);
        const y2 = parsePercent(to.top);

        const color = INTERACTION_COLORS[interaction.type];

        // Control point for a gentle curve
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        // Offset perpendicular to the line
        const cpX = midX - dy * 0.15;
        const cpY = midY + dx * 0.15;

        // Label position at the curve midpoint
        const labelX = (x1 + 2 * cpX + x2) / 4;
        const labelY = (y1 + 2 * cpY + y2) / 4;

        return {
          ...interaction,
          x1, y1, x2, y2, cpX, cpY, labelX, labelY, color,
        };
      })
      .filter(Boolean) as Array<{
        id: string; type: string; label: string; color: string;
        x1: number; y1: number; x2: number; y2: number;
        cpX: number; cpY: number; labelX: number; labelY: number;
      }>;
  }, [interactions, positionMap]);

  if (lines.length === 0) return null;

  return (
    <svg className="interaction-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        {lines.map((line) => (
          <linearGradient key={`grad-${line.id}`} id={`grad-${line.id}`} x1={`${line.x1}%`} y1={`${line.y1}%`} x2={`${line.x2}%`} y2={`${line.y2}%`}>
            <stop offset="0%" stopColor={line.color} stopOpacity="0.6" />
            <stop offset="50%" stopColor={line.color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={line.color} stopOpacity="0.6" />
          </linearGradient>
        ))}
      </defs>

      {lines.map((line) => (
        <g key={line.id}>
          {/* Glow behind the line */}
          <path
            d={`M ${line.x1} ${line.y1} Q ${line.cpX} ${line.cpY} ${line.x2} ${line.y2}`}
            fill="none"
            stroke={line.color}
            strokeWidth="0.4"
            strokeOpacity="0.2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Main animated line */}
          <path
            className="interaction-line-path"
            d={`M ${line.x1} ${line.y1} Q ${line.cpX} ${line.cpY} ${line.x2} ${line.y2}`}
            fill="none"
            stroke={`url(#grad-${line.id})`}
            strokeWidth="0.18"
            strokeDasharray="0.6 0.4"
            vectorEffect="non-scaling-stroke"
          />
          {/* Endpoint dots */}
          <circle cx={line.x1} cy={line.y1} r="0.35" fill={line.color} opacity="0.8" />
          <circle cx={line.x2} cy={line.y2} r="0.35" fill={line.color} opacity="0.8" />
        </g>
      ))}

      {/* Labels rendered as foreignObject for proper text rendering */}
      {lines.map((line) => (
        <foreignObject
          key={`label-${line.id}`}
          x={`${line.labelX - 5}%`}
          y={`${line.labelY - 1.5}%`}
          width="10%"
          height="3%"
          overflow="visible"
        >
          <div className="interaction-label" style={{ borderColor: line.color, color: line.color }}>
            {line.label}
          </div>
        </foreignObject>
      ))}
    </svg>
  );
}
