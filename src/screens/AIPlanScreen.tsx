/**
 * AIPlanScreen — coming-soon teaser for the AI travel planner feature.
 * Matches the web version's teaser layout in Vietnamese.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { Icon } from '../components/ui/Icon';
import { colors, status } from '../theme/colors';

export default function AIPlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Trợ lý AI</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Bot icon */}
        <View style={styles.iconWrap}>
          <Icon name="bot" size={64} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Trợ lý AI Checkpoint</Text>

        {/* Coming soon badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Sắp ra mắt</Text>
        </View>

        <Text style={styles.subtitle}>
          Trải nghiệm lập kế hoạch chuyến đi thông minh với AI — giúp bạn khám phá
          những địa điểm thú vị và tạo hành trình hoàn hảo.
        </Text>

        {/* Teaser bullets */}
        <View style={styles.bullets}>
          <TeaserBullet
            emoji="🗺️"
            title="Gợi ý hành trình cá nhân hoá"
            desc="AI phân tích sở thích và lịch sử check-in của bạn để đề xuất lộ trình phù hợp nhất."
          />
          <TeaserBullet
            emoji="📍"
            title="Khám phá địa điểm ẩn"
            desc="Tìm những viên ngọc ẩn xung quanh bạn mà ít người biết đến."
          />
          <TeaserBullet
            emoji="⚡"
            title="Lên kế hoạch trong vài giây"
            desc="Chỉ cần mô tả chuyến đi mong muốn — AI sẽ lo phần còn lại."
          />
        </View>

        {/* Notification stub */}
        <View style={styles.notifyBox}>
          <Icon name="bell" size={20} color={status.gold} />
          <Text style={styles.notifyText}>
            Tính năng này đang được phát triển. Chúng tôi sẽ thông báo khi ra mắt!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TeaserBullet({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletEmoji}>{emoji}</Text>
      <View style={styles.bulletText}>
        <Text style={styles.bulletTitle}>{title}</Text>
        <Text style={styles.bulletDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEDFD1',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2A211C',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2A211C',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A6B5F',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  bullets: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 8,
  },
  bullet: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    padding: 14,
  },
  bulletEmoji: {
    fontSize: 28,
  },
  bulletText: {
    flex: 1,
    gap: 4,
  },
  bulletTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A211C',
  },
  bulletDesc: {
    fontSize: 13,
    color: '#7A6B5F',
    lineHeight: 19,
  },
  notifyBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 14,
    alignSelf: 'stretch',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F5D97A',
  },
  notifyText: {
    flex: 1,
    fontSize: 13,
    color: '#5C4D42',
    lineHeight: 19,
  },
});
