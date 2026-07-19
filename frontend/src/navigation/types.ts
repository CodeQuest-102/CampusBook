import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Room, Booking, BookingRequest } from '../data/placeholder';

/** Tabs shared across roles (each role uses a subset — see RootNavigator). */
export type MainTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Calendar: undefined;
  Notifications: undefined;
  Profile: undefined;
  Rooms: undefined;
  Requests: undefined;
  Reports: undefined;
  More: undefined;
};

/** Root stack — auth flow + main tabs + pushed detail/flow screens. */
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;

  BrowseRooms: undefined;
  RoomDetails: { room: Room };
  BookingForm: { room: Room };
  BookingConfirmation: { room: Room };
  DaySchedule: { date: string };
  RequestDetails: { request: BookingRequest };
  RoomManagement: undefined;
  BookingDetails: { booking: Booking };
  EditProfile: undefined;

  // Auth extras + mock/placeholder destinations so every button leads somewhere
  ForgotPassword: undefined;
  MyRequests: undefined;
  Preferences: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  Users: undefined;
  RoomForm: { mode: 'add' | 'edit'; room?: Room };
};
