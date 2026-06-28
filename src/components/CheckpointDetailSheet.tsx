/**
 * CheckpointDetailSheet — basic bottom sheet showing checkpoint name and
 * placeholder content.
 *
 * Full detail (images, reactions, comments, author) is implemented in Task 19.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Sheet } from './ui/Sheet';
import { getCheckpointDetail } from '../lib/api';

interface CheckpointDetailSheetProps {
  id: string | null;
  onClose: () => void;
}

export function CheckpointDetailSheet({ id, onClose }: CheckpointDetailSheetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['checkpoint', id],
    queryFn: () => getCheckpointDetail(id!),
    enabled: !!id,
  });

  return (
    <Sheet open={!!id} onClose={onClose} snapPoints={['40%', '70%']}>
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#B45309" />
          </View>
        )}

        {!isLoading && data && (
          <>
            <Text style={styles.name}>{data.checkpoint.name}</Text>
            {data.checkpoint.address ? (
              <Text style={styles.address}>{data.checkpoint.address}</Text>
            ) : null}
            <Text style={styles.category}>{data.checkpoint.category}</Text>

            {/* TODO Task 19: images, reactions, comments, author, rating */}
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Full detail coming in Task 19</Text>
            </View>
          </>
        )}

        {!isLoading && !data && (
          <View style={styles.center}>
            <Text style={styles.errorText}>Could not load checkpoint</Text>
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C0D05',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#7A6A5A',
    marginBottom: 4,
  },
  category: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 16,
  },
  placeholder: {
    backgroundColor: '#F5EDE4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#7A6A5A',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#B45309',
  },
});
