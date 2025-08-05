import React from 'react';

// Simple SVG icon components as fallbacks
const CircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-full"
  >
    <circle
      cx="12"
      cy="12"
      r="8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const RectangleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-full"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const LengthIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-full"
  >
    <line
      x1="4"
      y1="12"
      x2="20"
      y2="12"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="4"
      cy="12"
      r="2"
      fill="currentColor"
    />
    <circle
      cx="20"
      cy="12"
      r="2"
      fill="currentColor"
    />
  </svg>
);

const AngleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-full"
  >
    <path
      d="M12 2l8 8-8 8V2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const PointIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-full"
  >
    <circle
      cx="12"
      cy="12"
      r="3"
      fill="currentColor"
    />
  </svg>
);

// Tool icon mapping for actual cornerstone tool names
const toolIconComponents = {
  // Direct mappings for exact tool names
  Length: LengthIcon,
  CircleROI: CircleIcon,
  EllipticalROI: CircleIcon,
  RectangleROI: RectangleIcon,
  Bidirectional: LengthIcon,
  ArrowAnnotate: AngleIcon,
  Angle: AngleIcon,
  CobbAngle: AngleIcon,
  Probe: PointIcon,
  PlanarFreehandROI: LengthIcon,
  SplineROI: LengthIcon,
  LivewireContour: LengthIcon,
  SegmentBidirectional: LengthIcon,
  UltrasoundDirectionalTool: AngleIcon,
  UltrasoundPleuraBLineTool: AngleIcon,
  SCOORD3DPoint: PointIcon,

  // Legacy lowercase mappings for backward compatibility
  circle: CircleIcon,
  ellipse: CircleIcon,
  rectangle: RectangleIcon,
  roi: RectangleIcon,
  length: LengthIcon,
  line: LengthIcon,
  bidirectional: LengthIcon,
  point: PointIcon,
  angle: AngleIcon,
  freehand: LengthIcon,
  spline: LengthIcon,
  arrow: AngleIcon,
  annotation: AngleIcon,
};

// Map tool names to icon components with fallback logic
const getToolIconComponent = (toolName?: string): React.ComponentType => {
  if (!toolName) return CircleIcon; // Default fallback

  // Try exact match first (case-sensitive for actual tool names)
  if (toolIconComponents[toolName as keyof typeof toolIconComponents]) {
    return toolIconComponents[toolName as keyof typeof toolIconComponents];
  }

  // Try lowercase match for legacy support
  const normalizedToolName = toolName.toLowerCase();
  if (toolIconComponents[normalizedToolName as keyof typeof toolIconComponents]) {
    return toolIconComponents[normalizedToolName as keyof typeof toolIconComponents];
  }

  // Pattern matching for any unmapped tools
  if (normalizedToolName.includes('circle') || normalizedToolName.includes('ellipse')) {
    return CircleIcon;
  }
  if (
    normalizedToolName.includes('rectangle') ||
    normalizedToolName.includes('rect') ||
    normalizedToolName.includes('roi')
  ) {
    return RectangleIcon;
  }
  if (
    normalizedToolName.includes('length') ||
    normalizedToolName.includes('line') ||
    normalizedToolName.includes('distance')
  ) {
    return LengthIcon;
  }
  if (
    normalizedToolName.includes('bidirectional') ||
    normalizedToolName.includes('bi-directional')
  ) {
    return LengthIcon;
  }
  if (normalizedToolName.includes('point') || normalizedToolName.includes('probe')) {
    return PointIcon;
  }
  if (normalizedToolName.includes('angle') || normalizedToolName.includes('protractor')) {
    return AngleIcon;
  }
  if (
    normalizedToolName.includes('freehand') ||
    normalizedToolName.includes('spline') ||
    normalizedToolName.includes('curve')
  ) {
    return LengthIcon;
  }
  if (normalizedToolName.includes('arrow') || normalizedToolName.includes('annotation')) {
    return AngleIcon;
  }

  // Default fallback
  return CircleIcon;
};

// Tool icon component
interface ToolIconProps {
  toolName?: string;
  className?: string;
  size?: number;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ toolName, className = 'size-5', size }) => {
  const IconComponent = getToolIconComponent(toolName);

  return (
    <div
      className={className}
      style={size ? { width: size, height: size } : undefined}
      title={`${toolName || 'measurement'} tool`}
    >
      <IconComponent />
    </div>
  );
};

export default ToolIcon;
