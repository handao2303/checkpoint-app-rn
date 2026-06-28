import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import LoginScreen from '../screens/LoginScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import CheckpointDetailScreen from '../screens/CheckpointDetailScreen';
import PlaceDetailScreen from '../screens/PlaceDetailScreen';
import JourneyDetailScreen from '../screens/JourneyDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import BadgesScreen from '../screens/BadgesScreen';
import AIPlanScreen from '../screens/AIPlanScreen';
import FeedScreen from '../screens/FeedScreen';
import { LocationProvider } from '../location/LocationProvider';
import { AuthGateProvider } from '../context/AuthGate';
import { linking } from './LinkingConfig';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <LocationProvider>
      <NavigationContainer linking={linking}>
        <AuthGateProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs"             component={TabNavigator} />
            <Stack.Screen name="Login"            component={LoginScreen} />
            <Stack.Screen name="ChatList"         component={ChatListScreen} />
            <Stack.Screen name="ChatRoom"         component={ChatRoomScreen} />
            <Stack.Screen name="CheckpointDetail" component={CheckpointDetailScreen} />
            <Stack.Screen name="PlaceDetail"      component={PlaceDetailScreen} />
            <Stack.Screen name="JourneyDetail"    component={JourneyDetailScreen} />
            <Stack.Screen name="UserProfile"      component={UserProfileScreen} />
            <Stack.Screen name="Badges"           component={BadgesScreen} />
            <Stack.Screen name="AIPlan"           component={AIPlanScreen} />
            <Stack.Screen name="Feed"             component={FeedScreen} />
          </Stack.Navigator>
        </AuthGateProvider>
      </NavigationContainer>
    </LocationProvider>
  );
}
