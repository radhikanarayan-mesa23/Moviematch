import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading } from '../components/ui';
import { PreferenceForm } from '../components/PreferenceForm';
import { api, ApiError, ProfileBody } from '../lib/api';
import { getDeviceId } from '../lib/deviceId';
import { colors, spacing, type } from '../lib/theme';

export default function PreferencesScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: Omit<ProfileBody, 'deviceId'>) => {
    setError(null);
    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      await api.submitProfile(code, { deviceId, ...value });
      router.replace({ pathname: '/waiting', params: { code } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your preferences. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Heading
          title="Tell us your vibe"
          subtitle="Your partner won't see these answers until you both match."
        />
        <PreferenceForm onSubmit={handleSubmit} submitting={submitting} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  error: {
    ...type.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
});
