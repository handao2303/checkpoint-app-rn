import React from 'react';
import Svg, { Path, Circle, Line, Polyline, Rect, G, Polygon } from 'react-native-svg';
import { iconPaths, type IconName } from '../../icons/registry';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Self-hosted SVG icon. Renders a glyph from the local registry inside a shared
 * 24x24 Svg wrapper. Pass `color` as a hex or named color string (e.g. "#F05A28").
 */
export function Icon({ name, size = 24, color = '#000000', strokeWidth = 2.2 }: IconProps) {
  const paths = iconPaths[name];
  if (!paths) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </Svg>
  );
}
