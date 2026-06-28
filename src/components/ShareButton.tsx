import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from './ui/Icon';
import { light } from '../theme/colors';

interface ShareButtonProps {
  type: 'checkpoint' | 'place' | 'journey' | 'profile';
  id: string;
  name: string;
}

export function ShareButton({ type, id, name }: ShareButtonProps) {
  async function handleShare() {
    const { shareCheckpoint, sharePlace, shareJourney, shareUserProfile } = await import('../lib/share');
    if (type === 'checkpoint') await shareCheckpoint(id, name);
    else if (type === 'place') await sharePlace(id, name);
    else if (type === 'journey') await shareJourney(id, name);
    else await shareUserProfile(id, name);
  }
  return (
    <Pressable
      onPress={handleShare}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
      accessibilityLabel="Chia sẻ"
    >
      <Icon name="share" size={20} color={light.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 6 },
});
