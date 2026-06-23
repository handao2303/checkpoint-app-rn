import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./ui/Icon";
import { t } from "../lib/i18n";

export type MediaType = "image" | "video";

export interface MediaItem {
  url: string;
  thumbnailUrl?: string | null;
  mediaType?: MediaType | null;
  alt?: string;
  caption?: string;
}

export interface MediaPreviewProps {
  /** Controlled visibility of the full-screen lightbox. */
  visible: boolean;
  onClose: () => void;
  /** Ordered media to page through. */
  items: MediaItem[];
  /** Index to open on. Defaults to 0. */
  index?: number;
}

/**
 * Full-screen, swipeable lightbox gallery — RN parity with the web
 * `components/MediaPreview.tsx` PhotoProvider viewer. Paged horizontal
 * FlatList, close button, caption + position indicator. Video has no native
 * player here (expo-video isn't installed) so it shows the poster with a
 * non-interactive play overlay.
 */
export function MediaPreview({ visible, onClose, items, index = 0 }: MediaPreviewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MediaItem>>(null);
  const startIndex = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(startIndex);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setActiveIndex((prev) => (prev === next ? prev : next));
    },
    [width],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MediaItem>) => {
      const isVideo = item.mediaType === "video";
      const source = isVideo ? item.thumbnailUrl ?? item.url : item.url;
      return (
        <View style={[styles.page, { width, height }]}>
          <Image
            source={{ uri: source }}
            style={styles.media}
            contentFit="contain"
            accessibilityLabel={item.alt}
          />
          {isVideo ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <View style={styles.playButton}>
                <Icon name="play" size={26} color="#FFFFFF" />
              </View>
            </View>
          ) : null}
        </View>
      );
    },
    [width, height],
  );

  if (!items.length) return null;

  const activeCaption = items[activeIndex]?.caption;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item, i) => `${item.url}-${i}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onScroll}
          windowSize={3}
        />

        {/* Close button */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={[styles.closeButton, { top: insets.top + 8 }]}
          hitSlop={12}
        >
          <Icon name="x" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Position indicator */}
        {items.length > 1 ? (
          <View style={[styles.counter, { top: insets.top + 12 }]} pointerEvents="none">
            <Text style={styles.counterText}>
              {activeIndex + 1} / {items.length}
            </Text>
          </View>
        ) : null}

        {/* Caption */}
        {activeCaption ? (
          <View style={[styles.captionBar, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
            <Text style={styles.captionText}>{activeCaption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/**
 * Small convenience hook for the common controlled pattern:
 *   const lightbox = useMediaPreview();
 *   <Pressable onPress={() => lightbox.open(items, i)} />
 *   <MediaPreview {...lightbox.props} />
 */
export function useMediaPreview() {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [index, setIndex] = useState(0);

  const open = useCallback((nextItems: MediaItem[], nextIndex = 0) => {
    setItems(nextItems);
    setIndex(nextIndex);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  return {
    open,
    close,
    props: { visible, items, index, onClose: close } satisfies MediaPreviewProps,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  page: { alignItems: "center", justifyContent: "center" },
  media: { width: "100%", height: "100%" },
  playOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  counterText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  captionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  captionText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
