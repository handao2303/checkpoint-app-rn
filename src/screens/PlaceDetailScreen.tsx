/**
 * PlaceDetailScreen — detail view for a discovered place.
 * Route param: { id: string }
 *
 * - Place name, address, category
 * - Rating + visit count
 * - Map placeholder (prebuild required)
 * - Recent checkins list
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { getPlace, type FeedItem } from '../lib/api';
import { Icon } from '../components/ui/Icon';
import { colors } from '../theme/colors';

export default function PlaceDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PlaceDetail'>>();
  const { id } = route.params;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['placeDetail', id],
    queryFn: () => getPlace(id),
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
          <Text style={styles.errorText}>Không tải được địa điểm.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { place, avg_rating, checkins } = data;

  const renderCheckin = ({ item }: { item: FeedItem }) => (
    <Pressable
      style={styles.checkinCard}
      onPress={() => navigation.navigate('CheckpointDetail', { id: item.id })}
    >
      {item.thumbnail_url || item.image_url ? (
        <Image
          source={{ uri: item.thumbnail_url ?? item.image_url ?? '' }}
          style={styles.checkinImage}
        />
      ) : (
        <View style={[styles.checkinImage, styles.checkinImageFallback]}>
          <Icon name="image" size={18} color={colors.foregroundMuted} />
        </View>
      )}
      <View style={styles.checkinInfo}>
        <Text style={styles.checkinName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.checkinAuthor}>
          {item.author.display_name || item.author.username}
        </Text>
        {item.rating != null ? (
          <View style={styles.ratingRow}>
            <Icon name="star" size={12} color="#E0A73A" />
            <Text style={styles.ratingText}>{item.rating}/5</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{place.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover image */}
        {place.cover_image_url ? (
          <Image source={{ uri: place.cover_image_url }} style={styles.cover} resizeMode="cover" />
        ) : null}

        {/* Place info */}
        <View style={styles.infoSection}>
          <Text style={styles.placeName}>{place.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{place.category}</Text>
            </View>
            {avg_rating != null ? (
              <View style={styles.ratingRow}>
                <Icon name="star" size={14} color="#E0A73A" />
                <Text style={styles.ratingValueText}>{avg_rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {place.address ? (
            <View style={styles.addressRow}>
              <Icon name="map-pin" size={14} color={colors.foregroundMuted} />
              <Text style={styles.addressText}>{place.address}</Text>
            </View>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <Icon name="user" size={14} color={colors.foregroundMuted} />
            <Text style={styles.statsText}>{place.checkin_count} lượt check-in</Text>
          </View>
        </View>

        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>Bản đồ (cần prebuild)</Text>
        </View>

        {/* Recent checkins */}
        <View style={styles.checkinsSection}>
          <Text style={styles.sectionTitle}>Check-in gần đây</Text>
          {checkins.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có check-in nào tại đây.</Text>
          ) : (
            <FlatList
              data={checkins}
              keyExtractor={(item) => item.id}
              renderItem={renderCheckin}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 8 }}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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

  cover: { width: '100%', height: 220 },

  infoSection: { padding: 16, gap: 10 },
  placeName: { fontSize: 22, fontWeight: '800', color: '#2A211C' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryChip: {
    backgroundColor: '#FFF0E8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFC2A8',
  },
  categoryText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValueText: { fontSize: 13, fontWeight: '600', color: '#E0A73A' },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 13, color: '#7A6B5F', lineHeight: 18 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsText: { fontSize: 13, color: '#7A6B5F' },

  mapPlaceholder: {
    height: 200,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  mapPlaceholderText: { fontSize: 14, color: '#6B7280' },

  checkinsSection: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2A211C' },
  emptyText: { fontSize: 14, color: '#7A6B5F' },

  checkinCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    overflow: 'hidden',
  },
  checkinImage: { width: 72, height: 72 },
  checkinImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1EA',
  },
  checkinInfo: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  checkinName: { fontSize: 14, fontWeight: '700', color: '#2A211C' },
  checkinAuthor: { fontSize: 12, color: '#7A6B5F' },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#E0A73A' },
});
