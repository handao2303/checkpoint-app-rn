import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Map: undefined;
  Discover: undefined;
  Create: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Login: undefined;
  ChatList: undefined;
  ChatRoom: { roomId: string };
  CheckpointDetail: { id: string };
  PlaceDetail: { id: string };
  JourneyDetail: { id: string };
  UserProfile: { userId: string };
  Badges: undefined;
  AIPlan: undefined;
  Feed: undefined;
};
