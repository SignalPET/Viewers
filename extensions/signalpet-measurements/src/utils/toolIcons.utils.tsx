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

const ArrowIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-full"
  >
    <g transform="translate(3, 2.5)">
      <path
        d="M0.435165 10.3667H0C0 10.6292 0.191473 10.8354 0.435165 10.8354V10.3667ZM0.87033 7.04852C0.87033 6.78606 0.678858 6.57985 0.435165 6.57985C0.191473 6.57985 0 6.78606 0 7.04852H0.87033ZM3.51614 10.8354C3.75984 10.8354 3.95131 10.6292 3.95131 10.3667C3.95131 10.1042 3.75984 9.89803 3.51614 9.89803V10.8354ZM0.739786 10.6948L9.89565 0.833968L9.27773 0.168457L0.121859 10.0293L0.739786 10.6948ZM0.87033 10.3667V7.04852H0V10.3667H0.87033ZM0.435165 10.8354H3.51614V9.89803H0.435165V10.8354Z"
        fill="currentColor"
      />
      <path
        d="M9.86939 0.872516C10.0435 0.685049 10.0435 0.394475 9.86939 0.207007C9.69533 0.0195393 9.42553 0.0195393 9.25146 0.207007L9.86939 0.872516Z"
        fill="currentColor"
      />
    </g>
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
  ArrowAnnotate: ArrowIcon,
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
  arrow: ArrowIcon,
  annotation: ArrowIcon,
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
    return ArrowIcon;
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
