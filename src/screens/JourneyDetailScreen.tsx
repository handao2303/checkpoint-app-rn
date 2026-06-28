/**
 * JourneyDetailScreen — full detail view for a journey.
 * Route param: { id: string }
 *
 * - Journey title, description
 * - Stats row: checkpoint_count, total_xp, distance_km
 * - Map placeholder
 * - Stops list (FlatList)
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { getJourney, type JourneyStop } from '../lib/api';
import { Icon } from '../components/ui/Icon';
import { colors, status } from '../theme/colors';

export default function JourneyDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'JourneyDetail'>>();
  const { id } = route.params;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journeyDetail', id],
    queryFn: () => getJourney(id),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Không tải được hành trình.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { journey, stats, checkpoints } = data;

  const renderStop: ListRenderItem<JourneyStop> = ({ item, index }) => (
    <Pressable
      style={styles.stopCard}
      onPress={() => navigation.navigate('CheckpointDetail', { id: item.id })}
    >
      {/* Step number */}
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{index + 1}</Text>
      </View>

      {/* Thumbnail */}
      {item.thumbnail_url || item.image_url ? (
        <Image
          source={{ uri: item.thumbnail_url ?? item.image_url ?? '' }}
          style={styles.stopImage}
        />
      ) : (
        <View style={[styles.stopImage, styles.stopImageFallback]}>
          <Icon name="map-pin" size={20} color={colors.foregroundMuted} />
        </View>
      )}

      {/* Info */}
      <View style={styles.stopInfo}>
        <Text style={styles.stopName} numberOfLines={1}>{item.name}</Text>
        {item.address ? (
          <Text style={styles.stopAddress} numberOfLines={1}>{item.address}</Text>
        ) : null}
        <Text style={styles.stopDate}>
          {new Date(item.created_at).toLocaleDateString('vi-VN')}
        </Text>
      </View>

      <Icon name="chevron-right" size={16} color={colors.foregroundMuted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{journey.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Journey info */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Icon
              name={journey.is_active ? 'flag' : 'flag-planted'}
              size={20}
              color={journey.is_active ? colors.primary : colors.foregroundMuted}
            />
            <Text style={styles.journeyTitle}>{journey.title}</Text>
            {journey.is_active ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Đang đi</Text>
              </View>
            ) : null}
          </View>

          {journey.description ? (
            <Text style={styles.description}>{journey.description}</Text>
          ) : null}

          {/* Dates */}
          {journey.started_at ? (
            <Text style={styles.dateLine}>
              Bắt đầu: {new Date(journey.started_at).toLocaleDateString('vi-VN')}
              {journey.ended_at
                ? `  →  ${new Date(journey.ended_at).toLocaleDateString('vi-VN')}`
                : ''}
            </Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatItem
            icon="map-pin"
            label="Điểm dừng"
            value={String(stats.checkpoint_count)}
            iconColor={colors.primary}
          />
          <View style={styles.statDivider} />
          <StatItem
            icon="xp-coin"
            label="Tổng XP"
            value={stats.total_xp.toLocaleString()}
            iconColor={status.gold}
          />
          <View style={styles.statDivider} />
          <StatItem
            icon="route"
            label="Km"
            value={stats.distance_km.toFixed(1)}
            iconColor={colors.green}
          />
        </View>

        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>Bản đồ (cần prebuild)</Text>
        </View>

        {/* Stops */}
        <View style={styles.stopsSection}>
          <Text style={styles.sectionTitle}>
            Các điểm dừng ({checkpoints.length})
          </Text>
          {checkpoints.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có điểm dừng nào.</Text>
          ) : (
            <FlatList
              data={checkpoints}
              keyExtractor={(item) => item.id}
              renderItem={renderStop}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 8 }}
            />
          )}
        </View>

        {/* Join / Leave button */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.joinBtn, pressed && { opacity: 0.7 }]}
            onPress={() =>
              Alert.alert(
                'Tham gia hành trình',
                'Tính năng sắp ra mắt trên ứng dụng di động.',
                [{ text: 'OK' }],
              )
            }
          >
            <Icon name="flag" size={16} color="#fff" />
            <Text style={styles.joinBtnText}>Tham gia</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  icon,
  label,
  value,
  iconColor,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={18} color={iconColor ?? colors.foreground} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF8F1' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEDFD1',
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#2A211C', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#7A6B5F' },

  infoSection: { padding: 16, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  journeyTitle: { fontSize: 20, fontWeight: '800', color: '#2A211C', flex: 1 },
  activeBadge: {
    backgroundColor: '#EAF5EC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#2F8A52' },
  description: { fontSize: 14, color: '#5C4D42', lineHeight: 20 },
  dateLine: { fontSize: 12, color: '#7A6B5F' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF8',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEDFD1',
    paddingVertical: 14,
    marginBottom: 4,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#2A211C' },
  statLabel: { fontSize: 11, color: '#7A6B5F' },
  statDivider: { width: 1, backgroundColor: '#EEDFD1' },

  mapPlaceholder: {
    height: 200,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  mapPlaceholderText: { fontSize: 14, color: '#6B7280' },

  stopsSection: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2A211C' },
  emptyText: { fontSize: 14, color: '#7A6B5F' },

  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    padding: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stopImage: { width: 56, height: 56, borderRadius: 8 },
  stopImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1EA',
  },
  stopInfo: { flex: 1, gap: 3 },
  stopName: { fontSize: 14, fontWeight: '700', color: '#2A211C' },
  stopAddress: { fontSize: 12, color: '#7A6B5F' },
  stopDate: { fontSize: 11, color: '#BBAA9A' },
  actionRow: { paddingHorizontal: 16, paddingVertical: 12 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F05A28',
    borderRadius: 10,
    paddingVertical: 12,
  },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
