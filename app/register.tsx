import { useEffect, useState } from "react";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, isLoading, register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      router.replace("/login");
    }, 700);

    return () => clearTimeout(timeout);
  }, [router, success]);

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
    setSuccess("");

    try {
      await register({
        ...form,
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase()
      });
      setSuccess("Account created. Please sign in.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to register right now.";
      setError(message);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.scrollContentGrow]}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.brand}>ERP</Text>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Build your event workspace. Invite members, assign tasks, and
              track every rupee with control.
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>Members</Text>
              <Text style={styles.badge}>Assignments</Text>
              <Text style={styles.badge}>Donations</Text>
              <Text style={styles.badge}>Audit</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Register</Text>
            <Text style={styles.cardSubtitle}>
              Use the same backend and account rules as the website.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, name: value }))
                }
                placeholder="Full name"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.name}
              />
            </View>

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
                placeholder="unique.username"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.username}
              />
              <Text style={styles.helper}>
                Usernames are stored in lowercase automatically.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    email: value.toLowerCase()
                  }))
                }
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, phone: value }))
                }
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.phone}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, password: value }))
                }
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={styles.input}
                value={form.password}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

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
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </Pressable>

            <Link href="/login" style={styles.footerLink}>
              Already have an account? Sign in
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
  scrollContentGrow: {
    flexGrow: 1,
    paddingBottom: spacing.xxl
  },
  hero: {
    backgroundColor: colors.heroSecondary,
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
    fontSize: 32,
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
  success: {
    backgroundColor: colors.successSoft,
    color: colors.success,
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
