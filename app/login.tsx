import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, isLoading, login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.bootScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/events" />;
  }

  const handleSubmit = async () => {
    setError("");

    try {
      await login({
        username: form.username.trim().toLowerCase(),
        password: form.password
      });
      router.replace("/events");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in right now.";
      setError(message);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.brand}>ERP</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Run events like a command center. Coordinate members, tasks, and
              finance with clarity.
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>Events</Text>
              <Text style={styles.badge}>Tasks</Text>
              <Text style={styles.badge}>Finance</Text>
              <Text style={styles.badge}>Reports</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.cardSubtitle}>
              Use the same account you use on the website.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    username: value.toLowerCase()
                  }))
                }
                placeholder="your.username"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.username}
              />
              <Text style={styles.helper}>
                Usernames are matched in lowercase automatically.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, password: value }))
                }
                placeholder="Your password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={styles.input}
                value={form.password}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={isLoading}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                isLoading && styles.buttonDisabled
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
              )}
            </Pressable>

            <Link href="/register" style={styles.footerLink}>
              New here? Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink
  },
  flex: {
    flex: 1
  },
  screen: {
    flex: 1,
    backgroundColor: colors.ink
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  hero: {
    backgroundColor: colors.hero,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm
  },
  brand: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.2
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.railText,
    fontSize: 16,
    lineHeight: 24
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  badge: {
    backgroundColor: colors.heroBadge,
    color: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    fontWeight: "700"
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card
  },
  cardTitle: {
    color: colors.textHeading,
    fontSize: 28,
    fontWeight: "800"
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  field: {
    gap: 8
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textHeading,
    backgroundColor: colors.cardMuted
  },
  helper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  error: {
    backgroundColor: colors.errorSoft,
    color: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonPressed: {
    opacity: 0.92
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800"
  },
  buttonDisabled: {
    opacity: 0.75
  },
  footerLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  }
});
