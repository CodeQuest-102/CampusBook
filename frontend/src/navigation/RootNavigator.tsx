import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomNav } from '../components';
import { useApp } from './AppContext';
import type { RootStackParamList, MainTabParamList } from './types';

// Auth / onboarding
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';

// Shared flow / detail screens
import BrowseRoomsScreen from '../screens/student/BrowseRoomsScreen';
import RoomDetailsScreen from '../screens/student/RoomDetailsScreen';
import BookingFormScreen from '../screens/student/BookingFormScreen';
import BookingConfirmationScreen from '../screens/student/BookingConfirmationScreen';
import BookingDetailsScreen from '../screens/student/BookingDetailsScreen';
import DayScheduleScreen from '../screens/student/DayScheduleScreen';
import RequestDetailsScreen from '../screens/admin/RequestDetailsScreen';
import RoomManagementScreen from '../screens/admin/RoomManagementScreen';
import RoomFormScreen from '../screens/admin/RoomFormScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import AddUserScreen from '../screens/admin/AddUserScreen';
import SubscriptionScreen from '../screens/admin/SubscriptionScreen';

// Secondary screens reached from Profile / Settings
import ForgotPasswordScreen from '../screens/misc/ForgotPasswordScreen';
import MyRequestsScreen from '../screens/misc/MyRequestsScreen';
import SettingsScreen from '../screens/misc/SettingsScreen';
import HelpSupportScreen from '../screens/misc/HelpSupportScreen';

// Tab screens
import StudentDashboard from '../screens/student/StudentDashboard';
import StaffDashboard from '../screens/staff/StaffDashboard';
import AdminDashboard from '../screens/admin/AdminDashboard';
import MyBookingsScreen from '../screens/student/MyBookingsScreen';
import CalendarScreen from '../screens/student/CalendarScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import EditProfileScreen from '../screens/student/EditProfileScreen';
import PendingRequestsScreen from '../screens/admin/PendingRequestsScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/** Home tab picks the dashboard for the active role. */
function HomeDashboard() {
  const { role } = useApp();
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'staff') return <StaffDashboard />;
  return <StudentDashboard />;
}

/** Role-based bottom tabs, all rendered through the shared BottomNav bar. */
function MainTabs() {
  const { role } = useApp();

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeDashboard} />
      {role === 'admin' ? (
        <>
          <Tab.Screen name="Requests" component={PendingRequestsScreen} />
          <Tab.Screen name="Calendar" component={CalendarScreen} />
          <Tab.Screen name="Reports" component={ReportsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Bookings" component={MyBookingsScreen} />
          <Tab.Screen name="Calendar" component={CalendarScreen} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useApp();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <View style={styles.root}>
      {/* Mounted only once bootstrapping is done, so the right stack is picked
          from the first render and a signed-in user never sees the auth stack.
          It lays out underneath the opaque splash, so the splash's fade-out
          reveals a fully-rendered first screen instead of fading to white. */}
      {!isBootstrapping && (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            {!isAuthenticated ? (
              // Auth stack — swapped out automatically once signed in.
              <>
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              </>
            ) : (
              // Authenticated app.
              <>
                <Stack.Screen name="Main" component={MainTabs} />

                {/* Flow + detail screens pushed above the tabs */}
                <Stack.Screen name="BrowseRooms" component={BrowseRoomsScreen} />
                <Stack.Screen name="RoomDetails" component={RoomDetailsScreen} />
                <Stack.Screen name="BookingForm" component={BookingFormScreen} />
                <Stack.Screen
                  name="BookingConfirmation"
                  component={BookingConfirmationScreen}
                  options={{ animation: 'fade' }}
                />
                <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="DaySchedule" component={DayScheduleScreen} />
                <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
                <Stack.Screen name="RoomManagement" component={RoomManagementScreen} />
                <Stack.Screen name="RoomForm" component={RoomFormScreen} />
                <Stack.Screen name="Users" component={UsersScreen} />
                <Stack.Screen name="AddUser" component={AddUserScreen} />
                <Stack.Screen name="Subscription" component={SubscriptionScreen} />

                {/* Secondary screens reached from Profile / Settings */}
                <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}

      {/* Overlays the navigator and fades itself out once the session is
          restored and it has had its minimum time on screen. */}
      {!splashDone && (
        <SplashScreen canExit={!isBootstrapping} onFinish={() => setSplashDone(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
