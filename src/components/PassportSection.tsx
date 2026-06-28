/**
 * PassportSection — province stamp grid.
 * Ported from web/src/components/PassportSection.tsx.
 * Displays a horizontal scroll of unlocked province stamps + 1 locked placeholder.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Path, Rect, Line, Text as SvgText } from 'react-native-svg';

import { getPassport, getUserPassport, type PassportStamp as ApiStamp } from '../lib/api';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { colors } from '../theme/colors';

// ---- stamp themes -----------------------------------------------------------

const STAMP_THEMES = {
  blue:   { stroke: '#7FA8B8', bg: '#F2FAFC', text: '#5B8FA0' },
  green:  { stroke: '#8CA96B', bg: '#F5FAEF', text: '#6F8F4F' },
  orange: { stroke: '#C98B5A', bg: '#FFF4EA', text: '#B67242' },
  brown:  { stroke: '#C8A27C', bg: '#FAF5EF', text: '#A67C52' },
  locked: { stroke: '#D6C8BA', bg: 'transparent', text: '#B8A99B' },
} as const;

type ThemeKey = keyof typeof STAMP_THEMES;

// ---- helpers ----------------------------------------------------------------

function getProvinceInitials(province: string): string {
  const cleaned = province.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.map((w) => w[0]).join('').toUpperCase().substring(0, 3);
}

function formatShortDate(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).substring(2);
  return `${day}.${month}.${year}`;
}

interface StampConfig {
  id: string;
  name: string;
  label: string;
  unlocked: boolean;
  theme: (typeof STAMP_THEMES)[ThemeKey];
  date: string;
  initials: string;
  shapeType: number;
}

function getStampConfig(s: ApiStamp): StampConfig {
  const name = s.province.trim();
  const initials = getProvinceInitials(name);
  const date = formatShortDate(s.first_at);

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const uHash = Math.abs(hash);
  const shapeType = uHash % 4;
  const themeKeys: ThemeKey[] = ['blue', 'green', 'orange', 'brown'];
  const theme = STAMP_THEMES[themeKeys[uHash % themeKeys.length]];
  const cleanLabel = name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim().toUpperCase();

  return {
    id: s.province,
    name: name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim(),
    label: cleanLabel,
    unlocked: true,
    theme,
    initials,
    date,
    shapeType,
  };
}

// ---- stamp SVG --------------------------------------------------------------

function StampSvg({ initials, date, shapeType }: { initials: string; date: string; shapeType: number }) {
  const commonText = (
    <>
      <SvgText
        x="24" y="18" textAnchor="middle"
        fill="currentColor" fontSize="10" fontWeight="900"
      >
        {initials}
      </SvgText>
      <Line x1="15" y1="21" x2="33" y2="21" stroke="currentColor" strokeWidth="0.8" />
      <SvgText
        x="24" y="28" textAnchor="middle"
        fill="currentColor" fontSize="5.5" fontWeight="800"
      >
        {date}
      </SvgText>
    </>
  );

  return (
    <Svg width={48} height={40} viewBox="0 0 48 40" fill="none">
      {shapeType === 0 && (
        <>
          <Circle cx="24" cy="20" r="17" stroke="currentColor" strokeWidth="1.2" />
          <Circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 1" />
          {commonText}
        </>
      )}
      {shapeType === 1 && (
        <>
          <Path d="M12 12C12 7 18 5 24 5S36 7 36 12V25C36 30 31 34 24 37 17 34 12 30 12 25Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          {commonText}
        </>
      )}
      {shapeType === 2 && (
        <>
          <Path d="M16 6h16l8 8v12l-8 8H16l-8-8V14z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          {commonText}
        </>
      )}
      {shapeType === 3 && (
        <>
          <Rect x="9" y="7" width="30" height="26" rx="3" stroke="currentColor" strokeWidth="1.2" />
          <Rect x="12" y="10" width="24" height="20" rx="1.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 1" />
          {commonText}
        </>
      )}
    </Svg>
  );
}

// ---- stamp cell -------------------------------------------------------------

function PassportStampCell({ stamp }: { stamp: StampConfig }) {
  const { theme, unlocked, label, initials, date, shapeType } = stamp;

  return (
    <View className="items-center gap-1.5 mr-3">
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          borderWidth: 1.5,
          borderStyle: unlocked ? 'solid' : 'dashed',
          borderColor: theme.stroke,
          backgroundColor: theme.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {unlocked ? (
          // Tint SVG via color prop; SvgText fill="currentColor" won't auto-inherit
          // so we pass theme.text directly to the wrapper and use it in child components.
          <View style={{ opacity: 0.9 }}>
            <Svg width={48} height={40} viewBox="0 0 48 40" fill="none">
              <StampSvgInner initials={initials} date={date} shapeType={shapeType} color={theme.text} />
            </Svg>
          </View>
        ) : (
          <Text className="font-display text-2xl font-extrabold opacity-60" style={{ color: theme.text }}>
            ?
          </Text>
        )}
      </View>
      <View
        style={{
          width: 72,
          paddingVertical: 3,
          borderWidth: 1,
          borderColor: theme.stroke,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      >
        <Text
          style={{ color: theme.text, fontSize: 9, fontWeight: '800', letterSpacing: 0.2 }}
          numberOfLines={1}
        >
          {unlocked ? label : '?'}
        </Text>
      </View>
    </View>
  );
}

// Inner SVG elements with explicit color prop (currentColor not supported in RN SVG)
function StampSvgInner({ initials, date, shapeType, color }: { initials: string; date: string; shapeType: number; color: string }) {
  const txt = (
    <>
      <SvgText x="24" y="18" textAnchor="middle" fill={color} fontSize="10" fontWeight="900">
        {initials}
      </SvgText>
      <Line x1="15" y1="21" x2="33" y2="21" stroke={color} strokeWidth="0.8" />
      <SvgText x="24" y="28" textAnchor="middle" fill={color} fontSize="5.5" fontWeight="800">
        {date}
      </SvgText>
    </>
  );

  return (
    <>
      {shapeType === 0 && (
        <>
          <Circle cx="24" cy="20" r="17" stroke={color} strokeWidth="1.2" />
          <Circle cx="24" cy="20" r="14" stroke={color} strokeWidth="0.8" strokeDasharray="2 1" />
          {txt}
        </>
      )}
      {shapeType === 1 && (
        <>
          <Path d="M12 12C12 7 18 5 24 5S36 7 36 12V25C36 30 31 34 24 37 17 34 12 30 12 25Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
          {txt}
        </>
      )}
      {shapeType === 2 && (
        <>
          <Path d="M16 6h16l8 8v12l-8 8H16l-8-8V14z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
          {txt}
        </>
      )}
      {shapeType === 3 && (
        <>
          <Rect x="9" y="7" width="30" height="26" rx="3" stroke={color} strokeWidth="1.2" />
          <Rect x="12" y="10" width="24" height="20" rx="1.5" stroke={color} strokeWidth="0.8" strokeDasharray="2 1" />
          {txt}
        </>
      )}
    </>
  );
}

// ---- main component ---------------------------------------------------------

interface PassportSectionProps {
  /** If omitted, renders the signed-in caller's own passport. */
  userId?: string;
}

export function PassportSection({ userId }: PassportSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: userId ? ['passport', userId] : ['passport'],
    queryFn: userId ? () => getUserPassport(userId) : getPassport,
  });

  const unlockedStamps: StampConfig[] = (data?.stamps ?? []).map(getStampConfig);
  const unlockedCount = data?.province_count ?? 0;

  const lockedPlaceholder: StampConfig = {
    id: 'locked-next',
    name: 'Địa điểm mới',
    label: '?',
    unlocked: false,
    theme: STAMP_THEMES.locked,
    date: '',
    initials: '?',
    shapeType: 0,
  };

  const scrollItems = [...unlockedStamps, lockedPlaceholder];

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-lg font-bold text-foreground">Hộ chiếu</Text>
        {unlockedCount > 0 ? (
          <Text className="text-sm font-semibold text-muted-foreground">
            {unlockedCount} tỉnh thành
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="items-center gap-1.5 mr-3">
              <View className="w-16 h-16 rounded-full bg-surface-muted border border-border opacity-50" />
              <View className="w-[72px] h-[18px] rounded-lg bg-surface-muted border border-border opacity-50" />
            </View>
          ))}
        </ScrollView>
      ) : unlockedCount === 0 ? (
        <View className="rounded-2xl border-2 border-dashed border-border/60 bg-surface-muted p-6 items-center">
          <Text className="text-sm font-semibold text-foreground mb-1">
            {userId ? 'Người dùng này chưa có tem nào' : 'Bạn chưa mở khoá địa điểm nào'}
          </Text>
          {!userId ? (
            <Text className="text-xs text-muted-foreground text-center">
              Hãy cắm cờ ở khu vực mới để nhận tem hộ chiếu!
            </Text>
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {scrollItems.map((stamp) => (
            <PassportStampCell key={stamp.id} stamp={stamp} />
          ))}
        </ScrollView>
      )}
    </Card>
  );
}
