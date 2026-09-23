import React, { useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Screen, PrimaryButton, Card } from '../components/ui';
import { colors, spacing, type } from '../lib/theme';

export default function QrScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const shotRef = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);

  const shareUrl = `moviematch://join/${code}`;

  const handleShare = async () => {
    setSharing(true);
    try {
      const uri = await shotRef.current?.capture?.();
      const canShareFiles = uri && (await Sharing.isAvailableAsync());
      if (uri && canShareFiles) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share your Movie Match session',
        });
      } else {
        await Share.share({ message: `Join my Movie Match session! Code: ${code}\n${shareUrl}` });
      }
    } catch {
      // user cancelled or sharing unavailable — no-op
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Session started</Text>
        <Text style={styles.subtitle}>Share this with your partner so they can join</Text>
      </View>

      <View style={styles.qrWrap}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
          <Card style={styles.qrCard}>
            <QRCode value={shareUrl} size={220} backgroundColor={colors.white} color={colors.black} />
            <Text style={styles.code}>{code}</Text>
          </Card>
        </ViewShot>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Share" onPress={handleShare} loading={sharing} />
        <View style={{ height: spacing.md }} />
        <PrimaryButton
          label="Continue to preferences"
          variant="secondary"
          onPress={() => router.replace({ pathname: '/preferences', params: { code } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    ...type.h1,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  qrWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  code: {
    ...type.h1,
    letterSpacing: 4,
    color: colors.black,
    marginTop: spacing.lg,
  },
  actions: {
    marginBottom: spacing.lg,
  },
});
