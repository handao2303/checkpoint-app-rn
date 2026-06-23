import React from "react";
import Svg, { Path } from "react-native-svg";
import { iconPaths, type IconName } from "../../icons/iconPaths";

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = "currentColor", strokeWidth = 2.2 }: IconProps) {
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
      {paths.map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
