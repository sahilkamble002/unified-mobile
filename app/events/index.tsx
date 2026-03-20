import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link, Redirect } from "expo-router";
import { createEvent, getEvents, type EventMembership } from "@/src/api/events";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function EventsScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const [events, setEvents] = useState<EventMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });

  const adminCount = useMemo(
    () =>
      events.filter((item) => ["SUPER_ADMIN", "ADMIN"].includes(item.role))
        .length,
    [events]
  );
  const managerCount = useMemo(
    () => events.filter((item) => item.role === "MANAGER").length,
    [events]
  );

  const loadEvents = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getEvents();
      setEvents(data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load events.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadEvents();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await createEvent({
        name: form.name.trim(),
        description: form.description.trim()
      });
      setForm({ name: "", description: "" });
      await loadEvents();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create event.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => loadEvents("refresh")}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Community ERP</Text>
              <Text style={styles.heroTitle}>Your events</Text>
              <Text style={styles.heroSubtitle}>
                Create, track, and manage community operations from the same
                backend your website already uses.
              </Text>
            </View>

            <View style={styles.heroActions}>
              <Link href="/notifications" asChild>
                <Pressable style={styles.heroActionButton}>
                  <Text style={styles.heroActionButtonText}>Notifications</Text>
                </Pressable>
              </Link>

              <Pressable onPress={logout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.userChip}>
            <Text style={styles.userChipName}>{user?.name ?? "Member"}</Text>
            <Text style={styles.userChipMeta}>
              @{user?.username ?? "username"}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{events.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Admin</Text>
              <Text style={styles.statValue}>{adminCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Manager</Text>
              <Text style={styles.statValue}>{managerCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick create</Text>
          <Text style={styles.cardSubtitle}>
            Start an event in under 30 seconds.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Event name</Text>
            <TextInput
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, name: value }))
              }
              placeholder="Ambedkar Jayanti 2026"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={form.name}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              multiline
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              placeholder="Short description"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={form.description}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={creating}
            onPress={handleCreate}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              creating && styles.buttonDisabled
            ]}
          >
            {creating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Create event</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Event memberships</Text>
          <Text style={styles.listSubtitle}>
            Pull down to refresh, then tap any card to open its workspace.
          </Text>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.emptyText}>Loading events...</Text>
          </View>
        ) : null}

        {!loading && !events.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>
              Create your first event to start testing the mobile workflow.
            </Text>
          </View>
        ) : null}

        {!loading &&
          events.map((membership) => (
            <Link
              key={membership.id}
              href={`/events/${membership.event.id}`}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  styles.eventCard,
                  pressed && styles.eventCardPressed
                ]}
              >
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventTitle}>{membership.event.name}</Text>
                  <Text style={styles.rolePill}>{membership.role}</Text>
                </View>
                <Text style={styles.eventDescription}>
                  {membership.event.description || "No description yet."}
                </Text>
                <Text style={styles.eventLink}>Open event workspace</Text>
              </Pressable>
            </Link>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  hero: {
    backgroundColor: colors.hero,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  heroActions: {
    gap: spacing.sm
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: colors.railText,
    fontSize: 15,
    lineHeight: 22
  },
  logoutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  heroActionButton: {
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  heroActionButtonText: {
    color: colors.textHeading,
    fontWeight: "800"
  },
  logoutButtonText: {
    color: colors.white,
    fontWeight: "700"
  },
  userChip: {
    backgroundColor: colors.heroBadge,
    borderRadius: radius.md,
    padding: spacing.md
  },
  userChipName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800"
  },
  userChipMeta: {
    color: colors.railText,
    marginTop: 4,
    fontSize: 13
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.heroBadge,
    borderRadius: radius.md,
    padding: spacing.md
  },
  statLabel: {
    color: colors.railText,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  statValue: {
    color: colors.white,
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800"
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
    fontSize: 24,
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
  textArea: {
    minHeight: 110
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
  listHeader: {
    gap: 6
  },
  listTitle: {
    color: colors.textHeading,
    fontSize: 22,
    fontWeight: "800"
  },
  listSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadow.card
  },
  emptyTitle: {
    color: colors.textHeading,
    fontSize: 20,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card
  },
  eventCardPressed: {
    opacity: 0.92
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  eventTitle: {
    flex: 1,
    color: colors.textHeading,
    fontSize: 20,
    fontWeight: "800"
  },
  rolePill: {
    backgroundColor: colors.primarySoft,
    color: colors.textHeading,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800"
  },
  eventDescription: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 21
  },
  eventLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700"
  }
});
