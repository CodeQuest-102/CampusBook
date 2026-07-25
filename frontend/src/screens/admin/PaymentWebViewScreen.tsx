import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TopBar } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { subscriptionApi, ApiError } from '../../api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentWebView'>;

/**
 * Hosts the Paystack checkout in a WebView. Paystack redirects the browser to the
 * server's callback URL once the test payment completes; we intercept that
 * navigation (rather than let the — deliberately unreachable — page load), then
 * ask the backend to verify the reference. The tier only flips on the server,
 * after Paystack confirms the payment.
 */
export default function PaymentWebViewScreen({ route, navigation }: Props) {
  const { authorizationUrl, reference, callbackUrl, planName } = route.params;
  const [verifying, setVerifying] = useState(false);
  const handled = useRef(false);

  const finish = async () => {
    setVerifying(true);
    try {
      await subscriptionApi.verifyPayment(reference);
      Alert.alert('Payment successful', `You're now on ${planName}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(
        'Payment not confirmed',
        e instanceof ApiError ? e.message : 'We could not confirm your payment. No change was made.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } finally {
      setVerifying(false);
    }
  };

  // Intercept the redirect to the callback URL before it loads — that page is a
  // sentinel and isn't meant to resolve. Guarded so it only fires once.
  const onShouldStartLoad = (req: ShouldStartLoadRequest): boolean => {
    if (!handled.current && req.url.startsWith(callbackUrl)) {
      handled.current = true;
      finish();
      return false;
    }
    return true;
  };

  // Fallback in case the platform loads the callback before the request hook fires.
  const onNavChange = (nav: WebViewNavigation) => {
    if (!handled.current && nav.url.startsWith(callbackUrl)) {
      handled.current = true;
      finish();
    }
  };

  return (
    <>
      <TopBar variant="title" title="Secure payment" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <WebView
          source={{ uri: authorizationUrl }}
          onShouldStartLoadWithRequest={onShouldStartLoad}
          onNavigationStateChange={onNavChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
        {verifying && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.verifyText}>Confirming your payment…</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  verifyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
});
