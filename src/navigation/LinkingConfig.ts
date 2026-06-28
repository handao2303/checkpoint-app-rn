import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['checkpoint://', 'https://checkpointapp.vn'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Map: '',
          Discover: 'discover',
          Leaderboard: 'leaderboard',
        },
      },
      CheckpointDetail: 'c/:id',
      PlaceDetail: 'p/:id',
      JourneyDetail: 'j/:id',
      UserProfile: 'u/:userId',
    },
  },
};
