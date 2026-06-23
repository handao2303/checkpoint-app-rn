import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import {
  getMyCheckpoints,
  getPassport,
  getUserCheckpoints,
  getUserPassport,
  type PassportStamp,
} from "../lib/api";
import { t } from "../lib/i18n";
import { useTheme } from "../theme/ThemeProvider";
import { gradients, radius, shadow, spacing } from "../theme/tokens";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";
import { MediaPreview, useMediaPreview, type MediaItem } from "./MediaPreview";

interface PassportSectionProps {
  /** Target user's id. Omit to render the signed-in caller's own passport. */
  userId?: string;
}

// 5 color themes mirroring web STAMP_THEMES.
const STAMP_THEMES = {
  blue: { stroke: "#7FA8B8", bg: "#F2FAFC", text: "#5B8FA0" },
  green: { stroke: "#8CA96B", bg: "#F5FAEF", text: "#6F8F4F" },
  orange: { stroke: "#C98B5A", bg: "#FFF4EA", text: "#B67242" },
  brown: { stroke: "#C8A27C", bg: "#FAF5EF", text: "#A67C52" },
  locked: { stroke: "#D6C8BA", bg: "transparent", text: "#B8A99B" },
} as const;

type StampTheme = (typeof STAMP_THEMES)[keyof typeof STAMP_THEMES];

function getProvinceInitials(province: string): string {
  const cleaned = province.replace(/^(Thành phố|Tỉnh)\s+/i, "").trim();
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().substring(0, 3);
}

function formatShortDate(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).substring(2);
  return `${day}.${month}.${year}`;
}

interface StampConfig {
  id: string;
  name: string;
  label: string;
  unlocked: boolean;
  count: number;
  theme: StampTheme;
  date: string;
  initials: string;
  shapeType: number;
  provinceCode?: string | null;
  coverUrl?: string;
  firstAt?: string;
  lastAt?: string;
}

function getStampConfig(stamp: PassportStamp): StampConfig {
  const name = stamp.province.trim();
  const initials = getProvinceInitials(name);
  const date = formatShortDate(stamp.first_at);

  // Deterministic layout based on province name hash (mirrors web).
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const uHash = Math.abs(hash);
  const shapeType = uHash % 4;
  const themes = [STAMP_THEMES.blue, STAMP_THEMES.green, STAMP_THEMES.orange, STAMP_THEMES.brown];
  const theme = themes[uHash % themes.length];

  const cleanName = name.replace(/^(Thành phố|Tỉnh)\s+/i, "").trim();

  return {
    id: stamp.province,
    name: cleanName,
    label: cleanName.toUpperCase(),
    unlocked: true,
    count: stamp.checkin_count,
    theme,
    initials,
    date,
    shapeType,
    provinceCode: stamp.province_code,
    coverUrl: stamp.cover_url,
    firstAt: stamp.first_at,
    lastAt: stamp.last_at,
  };
}

/** Decorative inner stamp art — RN port of web PassportStampIcon (react-native-svg). */
function PassportStampArt({
  initials,
  date,
  shapeType,
  color,
}: {
  initials: string;
  date: string;
  shapeType: number;
  color: string;
}) {
  const text = (
    <>
      <SvgText
        x={24}
        y={18}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight="900"
      >
        {initials}
      </SvgText>
      <SvgText x={24} y={28} textAnchor="middle" fill={color} fontSize={5.5} fontWeight="800">
        {date}
      </SvgText>
    </>
  );

  return (
    <Svg width="100%" height="100%" viewBox="0 0 48 40" fill="none">
      {shapeType === 0 && (
        <>
          <Circle cx={24} cy={20} r={17} stroke={color} strokeWidth={1.2} />
          <Circle cx={24} cy={20} r={14} stroke={color} strokeWidth={0.8} strokeDasharray="2 1" />
          <Line x1={16} y1={21} x2={32} y2={21} stroke={color} strokeWidth={0.8} />
        </>
      )}
      {shapeType === 1 && (
        <>
          <Path
            d="M12 12C12 7 18 5 24 5S36 7 36 12V25C36 30 31 34 24 37 17 34 12 30 12 25Z"
            stroke={color}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <Path
            d="M15 14C15 10 19 8 24 8S33 10 33 14V24C33 28 29 31 24 34 19 31 15 28 15 24Z"
            stroke={color}
            strokeWidth={0.8}
            strokeDasharray="2 1"
          />
          <Line x1={17} y1={21} x2={31} y2={21} stroke={color} strokeWidth={0.8} />
        </>
      )}
      {shapeType === 2 && (
        <>
          <Path
            d="M16 6h16l8 8v12l-8 8H16l-8-8V14z"
            stroke={color}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <Path
            d="M17 9h14l6 6v10l-6 6H17l-6-6V15z"
            stroke={color}
            strokeWidth={0.8}
            strokeDasharray="2 1"
          />
          <Line x1={14} y1={21} x2={34} y2={21} stroke={color} strokeWidth={0.8} />
        </>
      )}
      {shapeType === 3 && (
        <>
          <Rect x={9} y={7} width={30} height={26} rx={3} stroke={color} strokeWidth={1.2} />
          <Rect x={12} y={10} width={24} height={20} rx={1.5} stroke={color} strokeWidth={0.8} strokeDasharray="2 1" />
          <Line x1={15} y1={21} x2={33} y2={21} stroke={color} strokeWidth={0.8} />
        </>
      )}
      {text}
    </Svg>
  );
}

function PassportStampView({
  stamp,
  onPress,
}: {
  stamp: StampConfig;
  onPress?: () => void;
}) {
  const { theme } = stamp;
  return (
    <Pressable style={styles.stampWrap} onPress={onPress} disabled={!onPress}>
      <View
        style={[
          styles.stampDisc,
          {
            borderColor: theme.stroke,
            backgroundColor: theme.bg,
            borderStyle: stamp.unlocked ? "solid" : "dashed",
            padding: stamp.unlocked ? 4 : 0,
          },
        ]}
      >
        {stamp.unlocked ? (
          <View style={styles.stampArt}>
            <PassportStampArt
              initials={stamp.initials}
              date={stamp.date}
              shapeType={stamp.shapeType}
              color={theme.text}
            />
          </View>
        ) : (
          <Text style={[styles.lockedMark, { color: theme.text }]}>?</Text>
        )}
        {stamp.unlocked && stamp.count > 1 ? (
          <View style={[styles.countBadge, { borderColor: theme.stroke }]}>
            <Text style={[styles.countBadgeText, { color: theme.text }]}>{stamp.count}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.labelChip, { borderColor: theme.stroke }]}>
        <Text style={[styles.labelText, { color: theme.text }]} numberOfLines={1}>
          {stamp.unlocked ? stamp.label : "?"}
        </Text>
      </View>
    </Pressable>
  );
}

export function PassportSection({ userId }: PassportSectionProps) {
  const { theme } = useTheme();
  const lightbox = useMediaPreview();

  const { data, isLoading } = useQuery({
    queryKey: userId ? ["passport", userId] : ["passport"],
    queryFn: userId ? () => getUserPassport(userId) : getPassport,
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<StampConfig | null>(null);

  const unlockedStamps = useMemo<StampConfig[]>(
    () => (data?.stamps ?? []).map(getStampConfig),
    [data],
  );
  const unlockedCount = data?.province_count ?? 0;

  const { data: provinceCheckpoints = [], isLoading: isPhotosLoading } = useQuery({
    queryKey: [
      "passport-photos",
      userId || "me",
      selectedStamp?.provinceCode,
      selectedStamp?.name,
    ],
    queryFn: async () => {
      if (!selectedStamp) return [];
      const code = selectedStamp.provinceCode || undefined;
      const all = userId
        ? await getUserCheckpoints(userId, 100, code)
        : await getMyCheckpoints(100, code);
      if (!code) {
        const clean = selectedStamp.name.toLowerCase();
        return all.filter(
          (cp) =>
            (cp.address || "").toLowerCase().includes(clean) ||
            (cp.name || "").toLowerCase().includes(clean),
        );
      }
      return all;
    },
    enabled: !!selectedStamp,
  });

  const nextLockedStamp: StampConfig = {
    id: "locked-next",
    name: t("passport.newPlace"),
    label: "?",
    unlocked: false,
    count: 0,
    theme: STAMP_THEMES.locked,
    date: "",
    initials: "?",
    shapeType: 0,
  };

  const scrollItems = [...unlockedStamps, nextLockedStamp];
  const photos: MediaItem[] = provinceCheckpoints
    .filter((cp) => cp.image_url)
    .map((cp) => ({
      url: cp.image_url as string,
      thumbnailUrl: cp.thumbnail_url,
      mediaType: cp.media_type,
      alt: cp.name,
      caption: cp.name,
    }));

  return (
    <Card style={{ ...styles.card, backgroundColor: theme.surface, borderColor: theme.border }}>
      {/* Header banner — solid passport color (no expo-linear-gradient installed). */}
      <View style={[styles.banner, { backgroundColor: gradients.passport[0] }]}>
        <View style={styles.bannerLeft}>
          <Icon name="passport" size={22} color="#FFFFFF" />
          <Text style={styles.bannerTitle}>{t("passport.title")}</Text>
        </View>
        {data ? (
          <Text style={styles.bannerCount}>
            {t("passport.provinceCount", { count: unlockedCount })}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.stampWrap}>
              <View style={[styles.stampDisc, { borderColor: theme.border, backgroundColor: theme.muted }]} />
              <View style={[styles.labelChip, { borderColor: theme.border, backgroundColor: theme.muted }]} />
            </View>
          ))}
        </ScrollView>
      ) : unlockedCount === 0 ? (
        <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
            {userId ? t("passport.emptyOtherTitle") : t("passport.emptyOwnTitle")}
          </Text>
          {!userId ? (
            <Text style={[styles.emptyHint, { color: theme.mutedForeground }]}>
              {t("passport.emptyOwnHint")}
            </Text>
          ) : null}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {scrollItems.map((stamp) => (
            <PassportStampView
              key={stamp.id}
              stamp={stamp}
              onPress={stamp.unlocked ? () => setSelectedStamp(stamp) : undefined}
            />
          ))}
          {unlockedCount > 4 ? (
            <Pressable style={styles.stampWrap} onPress={() => setIsSheetOpen(true)}>
              <View style={[styles.stampDisc, styles.allDisc]}>
                <Icon name="chevron-right" size={24} color="#F05A28" />
              </View>
              <View style={[styles.labelChip, { borderColor: "#EEDFD1" }]}>
                <Text style={[styles.labelText, { color: "#F05A28" }]} numberOfLines={1}>
                  {t("passport.all")}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </ScrollView>
      )}

      {/* Full collection grid */}
      <Sheet visible={isSheetOpen} onClose={() => setIsSheetOpen(false)} maxHeightRatio={0.8}>
        <Text style={[styles.sheetTitle, { color: theme.foreground }]}>
          {t("passport.collection")}
        </Text>
        <ScrollView contentContainerStyle={styles.grid}>
          {[...unlockedStamps, nextLockedStamp].map((stamp) => (
            <PassportStampView
              key={stamp.id}
              stamp={stamp}
              onPress={
                stamp.unlocked
                  ? () => {
                      setIsSheetOpen(false);
                      setSelectedStamp(stamp);
                    }
                  : undefined
              }
            />
          ))}
        </ScrollView>
      </Sheet>

      {/* Per-province detail (cover, dates, photos) */}
      <Sheet visible={!!selectedStamp} onClose={() => setSelectedStamp(null)} maxHeightRatio={0.85}>
        {selectedStamp ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedStamp.coverUrl ? (
              <Image
                source={{ uri: selectedStamp.coverUrl }}
                style={styles.cover}
                contentFit="cover"
              />
            ) : null}
            <Text style={[styles.detailTitle, { color: theme.foreground }]}>
              {selectedStamp.name}
            </Text>
            <View style={styles.detailMetaRow}>
              <Text style={[styles.detailMeta, { color: theme.mutedForeground }]}>
                {t("passport.checkinCount", { count: selectedStamp.count })}
              </Text>
              {selectedStamp.firstAt ? (
                <Text style={[styles.detailMeta, { color: theme.mutedForeground }]}>
                  {t("passport.firstVisit")}: {formatShortDate(selectedStamp.firstAt)}
                </Text>
              ) : null}
              {selectedStamp.lastAt ? (
                <Text style={[styles.detailMeta, { color: theme.mutedForeground }]}>
                  {t("passport.lastVisit")}: {formatShortDate(selectedStamp.lastAt)}
                </Text>
              ) : null}
            </View>

            {isPhotosLoading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={theme.primary} />
            ) : photos.length === 0 ? (
              <Text style={[styles.noPhotos, { color: theme.mutedForeground }]}>
                {t("passport.noPhotos")}
              </Text>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((item, idx) => (
                  <Pressable
                    key={`${item.url}-${idx}`}
                    style={styles.photoCell}
                    onPress={() => lightbox.open(photos, idx)}
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl ?? item.url }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </Sheet>

      <MediaPreview {...lightbox.props} />
    </Card>
  );
}

const STAMP_DISC = 64;

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 0, overflow: "hidden", gap: 0 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bannerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  bannerCount: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" },
  row: { gap: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: spacing.md,
  },
  stampWrap: { alignItems: "center", gap: 6, width: 72 },
  stampDisc: {
    width: STAMP_DISC,
    height: STAMP_DISC,
    borderRadius: STAMP_DISC / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  allDisc: { borderColor: "#EEDFD1", backgroundColor: "#FFFDF8", borderStyle: "solid" },
  stampArt: { width: 48, height: 40, opacity: 0.9 },
  lockedMark: { fontSize: 24, fontWeight: "800", opacity: 0.6 },
  countBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: 10, fontWeight: "800" },
  labelChip: {
    width: 72,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  labelText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.2, textAlign: "center" },
  empty: {
    margin: spacing.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  emptyHint: { fontSize: 12, textAlign: "center" },
  sheetTitle: { fontSize: 17, fontWeight: "700", marginBottom: spacing.sm },
  cover: { width: "100%", height: 160, borderRadius: radius.lg, marginBottom: spacing.md, ...shadow.sm },
  detailTitle: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  detailMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  detailMeta: { fontSize: 12, fontWeight: "600" },
  noPhotos: { textAlign: "center", fontSize: 13, marginVertical: 24 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: spacing.lg },
  photoCell: { width: "31.5%", aspectRatio: 1, borderRadius: radius.sm, overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
});
