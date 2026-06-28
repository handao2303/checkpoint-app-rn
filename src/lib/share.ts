import { Share } from 'react-native';

export async function shareCheckpoint(id: string, name: string) {
  await Share.share({
    title: name,
    url: `https://checkpointapp.vn/c/${id}`,
    message: `Xem checkpoint "${name}" trên Checkpoint: https://checkpointapp.vn/c/${id}`,
  });
}

export async function sharePlace(id: string, name: string) {
  await Share.share({
    title: name,
    url: `https://checkpointapp.vn/p/${id}`,
    message: `Khám phá "${name}" trên Checkpoint: https://checkpointapp.vn/p/${id}`,
  });
}

export async function shareJourney(id: string, title: string) {
  await Share.share({
    title,
    url: `https://checkpointapp.vn/j/${id}`,
    message: `Xem hành trình "${title}" trên Checkpoint: https://checkpointapp.vn/j/${id}`,
  });
}

export async function shareUserProfile(userId: string, displayName: string) {
  await Share.share({
    title: displayName,
    url: `https://checkpointapp.vn/u/${userId}`,
    message: `Xem hồ sơ "${displayName}" trên Checkpoint: https://checkpointapp.vn/u/${userId}`,
  });
}
