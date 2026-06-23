import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors } from "../../theme/tokens";
import { frameById } from "../../lib/avatarFrames";

interface UserAvatarProps {
  url?: string | null;
  name?: string;
  size?: number;
  /** Optional avatar frame id (see lib/avatarFrames.ts). Renders a decorative
   *  ring around the avatar. When omitted, the plain avatar is rendered and all
   *  existing callers are unaffected. */
  frame?: string | null;
}

// The frame SVG's avatar hole (viewBox 220): center (110,104), radius ~65.
// As fractions of the frame box: the avatar disc is ~59% of the box, centered
// horizontally and nudged slightly above the vertical center.
const HOLE_SIZE_RATIO = 0.59;
const HOLE_CENTER_Y = 0.473; // 104 / 220

function Disc({ url, name, size }: { url?: string | null; name?: string; size: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.neutral[100] }}
        contentFit="cover"
      />
    );
  }

  const initial = (name ?? "?")[0].toUpperCase();
  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

export function UserAvatar({ url, name, size = 40, frame }: UserAvatarProps) {
  const frameDef = frame ? frameById(frame) : undefined;

  if (!frameDef) {
    return <Disc url={url} name={name} size={size} />;
  }

  // Render the avatar disc behind the frame art. The frame box is larger than
  // the disc so the ring sits around it (mirrors web AvatarFramePicker layout).
  const boxSize = size;
  const discSize = boxSize * HOLE_SIZE_RATIO;

  return (
    <View style={{ width: boxSize, height: boxSize }}>
      <View
        style={{
          position: "absolute",
          left: (boxSize - discSize) / 2,
          top: boxSize * HOLE_CENTER_Y - discSize / 2,
          width: discSize,
          height: discSize,
          borderRadius: discSize / 2,
          overflow: "hidden",
          backgroundColor: colors.neutral[100],
        }}
      >
        <Disc url={url} name={name} size={discSize} />
      </View>
      <Image
        source={{ uri: frameDef.file }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.primary[600],
    fontWeight: "700",
  },
});
