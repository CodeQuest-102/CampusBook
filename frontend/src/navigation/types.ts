import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Room, Booking, BookingRequest, ScheduleEntry } from '../data/types';

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
  BookingConfirmation: { room: Room; dateLabel: string; timeLabel: string; purpose: string };
  DaySchedule: { date: string; entries: ScheduleEntry[] };
  RequestDetails: { request: BookingRequest };
  RoomManagement: undefined;
  BookingDetails: { booking: Booking };
  EditProfile: undefined;

  // Auth extras + secondary destinations reached from Profile / Settings
  ForgotPassword: undefined;
  MyRequests: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  Users: undefined;
  AddUser: undefined;
  Subscription: undefined;
  PaymentWebView: {
    authorizationUrl: string;
    reference: string;
    callbackUrl: string;
    planName: string;
  };
  RoomForm: { mode: 'add' | 'edit'; room?: Room };
};
