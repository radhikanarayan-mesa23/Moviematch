import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Screen, PrimaryButton, Card } from '../components/ui';
import { colors, radius, spacing, type } from '../lib/theme';
import { api, ApiError } from '../lib/api';
import { getDeviceId } from '../lib/deviceId';

// Pulls the session code out of either a raw typed code or a scanned
// "moviematch://join/<code>" deep-link string.
function extractCode(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  const segments = trimmed.split('/').filter(Boolean);
  const last = segments.length > 0 ? segments[segments.length - 1] : trimmed;
  return last.toUpperCase();
}

export default function JoinScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedOnce, setScannedOnce] = useState(false);

  const attemptJoin = async (rawCode: string) => {
    const code = extractCode(rawCode);
    if (code.length < 4) {
      setError('That code looks too short. Try again.');
      return;
    }
    setError(null);
    setJoining(true);
    try {
      const deviceId = await getDeviceId();
      await api.joinSession(code, deviceId);
      router.replace({ pathname: '/preferences', params: { code } });
    } catch (e) {
      setScannedOnce(false);
      if (e instanceof ApiError) {
        if (e.status === 404) setError("We couldn't find that session. Double-check the code.");
        else if (e.status === 409) setError('This session already has two partners.');
        else setError(e.message);
      } else {
        setError('Could not reach the server. Is it running?');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedOnce || joining) return;
    setScannedOnce(true);
    attemptJoin(data);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Join a session</Text>
        <Text style={styles.subtitle}>Scan your partner's QR code, or type the code below</Text>
      </View>

      <Card style={styles.cameraCard}>
        {permission?.granted ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
            />
          </View>
        ) : (
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionText}>Camera access is needed to scan a QR code.</Text>
            <PrimaryButton label="Enable camera" variant="secondary" onPress={requestPermission} />
          </View>
        )}
      </Card>
      {permission?.granted ? (
        <PrimaryButton
          label={scanning ? 'Scanning...' : 'Scan QR code'}
          variant="secondary"
          onPress={() => setScanning((s) => !s)}
        />
      ) : null}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.label}>Enter the 6-character code</Text>
      <TextInput
        style={styles.input}
        placeholder="ABC123"
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        value={manualCode}
        onChangeText={setManualCode}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton
          label="Join session"
          onPress={() => attemptJoin(manualCode)}
          disabled={manualCode.trim().length < 4}
          loading={joining}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...type.h1,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  cameraCard: {
    padding: 0,
    overflow: 'hidden',
    height: 260,
    marginBottom: spacing.md,
  },
  cameraWrap: {
    flex: 1,
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionText: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...type.small,
    color: colors.textDim,
    marginHorizontal: spacing.md,
  },
  label: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    ...type.h2,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: {
    ...type.caption,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
});
