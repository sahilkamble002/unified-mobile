import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import {
  getNotifications,
  markNotificationRead,
  type NotificationItem
} from "@/src/api/notifications";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, shadow, spacing } from "@/src/theme";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" }
] as const;

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
};

type FilterValue = (typeof FILTERS)[number]["value"];

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState("");

  const loadNotifications = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadNotifications();
  }, [isAuthenticated]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  const handleMarkRead = async (notificationId: string) => {
    setMarkingId(notificationId);
    setError("");

    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark notification as read."
      );
    } finally {
      setMarkingId("");
    }
  };

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications("refresh")}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    filter === item.value && styles.filterChipActive,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filter === item.value && styles.filterChipTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.heroTitle}>Notifications</Text>
          <Text style={styles.heroSubtitle}>
            Every member can read updates here across the events they belong to.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{notifications.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Unread</Text>
              <Text style={styles.statValue}>{unreadCount}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.emptyText}>Loading notifications...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !visibleNotifications.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              New event updates will show up here for members and admins.
            </Text>
          </View>
        ) : null}

        {!loading &&
          visibleNotifications.map((item) => (
            <View key={item.id} style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                </View>
                <Text style={item.isRead ? styles.readBadge : styles.unreadBadge}>
                  {item.isRead ? "Read" : "Unread"}
                </Text>
              </View>

              <Text style={styles.notificationMeta}>
                Type: {item.type || "GENERAL"} | {formatDate(item.createdAt)}
              </Text>

              <View style={styles.actionRow}>
                {item.eventId ? (
                  <Pressable
                    onPress={() => router.push(`/events/${item.eventId}`)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.actionButton,
                      pressed && styles.buttonPressed
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>View event</Text>
                  </Pressable>
                ) : null}

                {!item.isRead ? (
                  <Pressable
                    onPress={() => {
                      void handleMarkRead(item.id);
                    }}
                    disabled={markingId === item.id}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.actionButton,
                      pressed && styles.buttonPressed,
                      markingId === item.id && styles.buttonDisabled
                    ]}
                  >
                    {markingId === item.id ? (
                      <ActivityIndicator color={colors.textHeading} />
                    ) : (
                      <Text style={styles.secondaryButtonText}>Mark read</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
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
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  backButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backButtonText: {
    color: colors.white,
    fontWeight: "700"
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "transparent"
  },
  filterChipActive: {
    backgroundColor: colors.white
  },
  filterChipText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800"
  },
  filterChipTextActive: {
    color: colors.textHeading
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
  error: {
    backgroundColor: colors.errorSoft,
    color: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20
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
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  notificationCopy: {
    flex: 1,
    gap: 6
  },
  notificationTitle: {
    color: colors.textHeading,
    fontSize: 19,
    fontWeight: "800"
  },
  notificationMessage: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 21
  },
  notificationMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800"
  },
  readBadge: {
    backgroundColor: colors.primarySoft,
    color: colors.textHeading,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: colors.textHeading,
    fontSize: 14,
    fontWeight: "800"
  },
  buttonPressed: {
    opacity: 0.92
  },
  buttonDisabled: {
    opacity: 0.75
  }
});
