import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  addEventMember,
  deleteEvent,
  getEventById,
  removeEventMember,
  updateEvent,
  updateMemberRole,
  type EventDetails,
  type EventMember
} from "@/src/api/events";
import {
  createDonation,
  createExpense,
  getDonationQR,
  getFinanceSummary,
  getEventDonations,
  getEventExpenses,
  verifyDonation,
  type Donation,
  type Expense,
  type FinanceSummary
} from "@/src/api/finance";
import {
  assignTask,
  createTask,
  deleteTask,
  getEventTasks,
  updateTaskStatus,
  type EventTask
} from "@/src/api/tasks";
import { searchUsers, type UserSearchResult } from "@/src/api/users";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, shadow, spacing } from "@/src/theme";

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE",
  "MANAGER",
  "VOLUNTEER",
  "VIEWER"
] as const;
const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD"] as const;
const TASK_MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
const FINANCE_ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE"];
const EVENT_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

const formatAmount = (value: number | null | undefined) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "recently";
  }

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "recently";
  }
};

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type ChoiceChipsProps = {
  options: readonly string[];
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
};

function ChoiceChips({
  options,
  value,
  onChange,
  disabled = false
}: ChoiceChipsProps) {
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const isSelected = option === value;

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.choiceChip,
              isSelected && styles.choiceChipActive,
              pressed && !disabled && styles.choiceChipPressed,
              disabled && styles.choiceChipDisabled
            ]}
          >
            <Text
              style={[
                styles.choiceChipText,
                isSelected && styles.choiceChipTextActive
              ]}
            >
              {formatLabel(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId: string }>();
  const rawEventId = params.eventId;
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null
  );
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [financeError, setFinanceError] = useState("");

  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    donationUpiId: "",
    fundingGoal: ""
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const [memberForm, setMemberForm] = useState({
    username: "",
    role: "VIEWER"
  });
  const [addingMember, setAddingMember] = useState(false);
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState("");
  const [updatingMemberUsername, setUpdatingMemberUsername] = useState("");
  const [removingMemberUsername, setRemovingMemberUsername] = useState("");

  const [taskForm, setTaskForm] = useState({ title: "", description: "" });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>(
    {}
  );
  const [assigningTaskId, setAssigningTaskId] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");

  const [donationForm, setDonationForm] = useState({
    donorName: "",
    amount: "",
    paymentMethod: "CASH",
    referenceId: ""
  });
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: ""
  });
  const [creatingDonation, setCreatingDonation] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [donationQr, setDonationQr] = useState("");
  const [verifyingDonationId, setVerifyingDonationId] = useState("");

  const members = useMemo(
    () => (Array.isArray(event?.members) ? event.members.filter(Boolean) : []),
    [event]
  );
  const memberUsernames = useMemo(
    () =>
      members
        .map((member) => member.user?.username)
        .filter((username): username is string => Boolean(username)),
    [members]
  );
  const currentMember = useMemo(
    () =>
      members.find(
        (member) =>
          member?.user?.id === user?.id ||
          member?.user?.username === user?.username
      ) || null,
    [members, user]
  );
  const currentMemberRole = currentMember?.role || "";
  const isCreator = event?.createdBy?.id === user?.id;
  const canManageTasks = TASK_MANAGER_ROLES.includes(currentMemberRole);
  const canManageFinance = FINANCE_ROLES.includes(currentMemberRole);
  const canManageMembers = EVENT_ADMIN_ROLES.includes(currentMemberRole);
  const canEditEvent = EVENT_ADMIN_ROLES.includes(currentMemberRole);
  const canDeleteEvent = Boolean(isCreator || currentMemberRole === "SUPER_ADMIN");

  const taskStats = useMemo(() => {
    const summary = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };

    tasks.forEach((task) => {
      if (task.status in summary) {
        summary[task.status as keyof typeof summary] += 1;
      }
    });

    return summary;
  }, [tasks]);

  const raisedAmount = financeSummary?.totalDonations ?? 0;
  const goalAmount = event?.fundingGoal ?? 0;
  const goalProgress = goalAmount
    ? Math.min(100, Math.round((raisedAmount / goalAmount) * 100))
    : 0;

  const loadScreen = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!eventId) {
        setError("Event id is missing.");
        setLoading(false);
        return;
      }

      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setFinanceError("");

      try {
        const [
          eventResult,
          taskResult,
          financeSummaryResult,
          donationsResult,
          expensesResult
        ] = await Promise.allSettled([
          getEventById(eventId),
          getEventTasks(eventId),
          getFinanceSummary(eventId),
          getEventDonations(eventId, { page: 1, limit: 5 }),
          getEventExpenses(eventId, { page: 1, limit: 5 })
        ]);

        if (eventResult.status === "fulfilled") {
          setEvent(eventResult.value);
          setEventForm({
            name: eventResult.value?.name || "",
            description: eventResult.value?.description || "",
            donationUpiId: eventResult.value?.donationUpiId || "",
            fundingGoal:
              eventResult.value?.fundingGoal !== null &&
              eventResult.value?.fundingGoal !== undefined
                ? String(eventResult.value.fundingGoal)
                : ""
          });
        } else {
          setEvent(null);
          setError(
            eventResult.reason instanceof Error
              ? eventResult.reason.message
              : "Failed to load event."
          );
        }

        setTasks(
          taskResult.status === "fulfilled" && Array.isArray(taskResult.value)
            ? taskResult.value
            : []
        );

        const financeMessages: string[] = [];

        if (financeSummaryResult.status === "fulfilled") {
          setFinanceSummary(financeSummaryResult.value);
        } else {
          financeMessages.push("finance summary");
          setFinanceSummary(null);
        }

        if (donationsResult.status === "fulfilled") {
          setDonations(
            Array.isArray(donationsResult.value?.donations)
              ? donationsResult.value.donations
              : []
          );
        } else {
          financeMessages.push("donations");
          setDonations([]);
        }

        if (expensesResult.status === "fulfilled") {
          setExpenses(
            Array.isArray(expensesResult.value?.expenses)
              ? expensesResult.value.expenses
              : []
          );
        } else {
          financeMessages.push("expenses");
          setExpenses([]);
        }

        setFinanceError(
          financeMessages.length
            ? `Unable to load ${financeMessages.join(", ")} right now.`
            : ""
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong while loading this event.";
        setError(message);
        setTasks([]);
        setFinanceSummary(null);
        setDonations([]);
        setExpenses([]);
        setFinanceError("");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadScreen();
  }, [isAuthenticated, loadScreen]);

  useEffect(() => {
    setDonationQr("");
  }, [eventId]);

  useEffect(() => {
    const query = memberForm.username.trim();

    if (!query || query.length < 2 || !canManageMembers) {
      setMemberResults([]);
      setMemberSearchLoading(false);
      setMemberSearchError("");
      return;
    }

    let isActive = true;
    setMemberSearchLoading(true);
    setMemberSearchError("");

    const timer = setTimeout(async () => {
      try {
        const data = await searchUsers(query);

        if (!isActive) {
          return;
        }

        const usernameSet = new Set(memberUsernames);
        setMemberResults(
          (data || []).filter((result) => !usernameSet.has(result.username))
        );
      } catch (err) {
        if (!isActive) {
          return;
        }

        setMemberResults([]);
        setMemberSearchError(
          err instanceof Error ? err.message : "Unable to search users."
        );
      } finally {
        if (isActive) {
          setMemberSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [canManageMembers, memberForm.username, memberUsernames]);

  const handleCreateTask = async () => {
    if (!eventId) {
      return;
    }

    if (!taskForm.title.trim()) {
      setError("Task title is required.");
      return;
    }

    setCreatingTask(true);
    setError("");

    try {
      await createTask(eventId, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim()
      });
      setTaskForm({ title: "", description: "" });
      await loadScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventId) {
      return;
    }

    if (!eventForm.name.trim()) {
      setError("Event name is required.");
      return;
    }

    const fundingGoal = eventForm.fundingGoal.trim();
    const parsedGoal =
      fundingGoal === "" ? null : Number.parseFloat(eventForm.fundingGoal);

    if (
      parsedGoal !== null &&
      (!Number.isFinite(parsedGoal) || parsedGoal < 0)
    ) {
      setError("Funding goal must be a valid positive number.");
      return;
    }

    setSavingEvent(true);
    setError("");

    try {
      await updateEvent(eventId, {
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        donationUpiId: eventForm.donationUpiId.trim() || null,
        fundingGoal: parsedGoal
      });
      setDonationQr("");
      await loadScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) {
      return;
    }

    setDeletingEvent(true);
    setError("");

    try {
      await deleteEvent(eventId);
      router.replace("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event.");
    } finally {
      setDeletingEvent(false);
    }
  };

  const confirmDeleteEvent = () => {
    Alert.alert(
      "Delete event?",
      "This event and its memberships will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDeleteEvent();
          }
        }
      ]
    );
  };

  const handleAddMember = async () => {
    if (!eventId) {
      return;
    }

    const username = memberForm.username.trim().toLowerCase();

    if (!username) {
      setError("Username is required to add a member.");
      return;
    }

    setAddingMember(true);
    setError("");

    try {
      await addEventMember(eventId, {
        username,
        role: memberForm.role
      });
      setMemberForm({ username: "", role: "VIEWER" });
      setMemberResults([]);
      await loadScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (
    member: EventMember,
    nextRole: string
  ) => {
    if (!eventId || !member.user?.username || member.role === nextRole) {
      return;
    }

    setUpdatingMemberUsername(member.user.username);
    setError("");

    try {
      await updateMemberRole(eventId, member.user.username, {
        role: nextRole
      });
      await loadScreen();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update member role."
      );
    } finally {
      setUpdatingMemberUsername("");
    }
  };

  const handleRemoveMember = async (username: string) => {
    if (!eventId) {
      return;
    }

    setRemovingMemberUsername(username);
    setError("");

    try {
      await removeEventMember(eventId, username);
      await loadScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setRemovingMemberUsername("");
    }
  };

  const confirmRemoveMember = (username: string) => {
    Alert.alert("Remove member?", `Remove @${username} from this event?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void handleRemoveMember(username);
        }
      }
    ]);
  };

  const handleAssignTask = async (taskId: string) => {
    const username = (taskAssignees[taskId] || "").trim().toLowerCase();

    if (!username) {
      setError("Pick or type a member username before assigning the task.");
      return;
    }

    setAssigningTaskId(taskId);
    setError("");

    try {
      await assignTask(taskId, { username });
      setTaskAssignees((prev) => ({ ...prev, [taskId]: "" }));
      await loadScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign task.");
    } finally {
      setAssigningTaskId("");
    }
  };

  const handleUpdateTaskStatus = async (task: EventTask, nextStatus: string) => {
    if (task.status === nextStatus) {
      return;
    }

    setUpdatingTaskId(task.id);
    setError("");

    try {
      await updateTaskStatus(task.id, { status: nextStatus });
      await loadScreen();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update task status."
      );
    } finally {
      setUpdatingTaskId("");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    setError("");

    try {
      await deleteTask(taskId);
      await loadScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setDeletingTaskId("");
    }
  };

  const confirmDeleteTask = (taskId: string) => {
    Alert.alert("Delete task?", "This task will be removed permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void handleDeleteTask(taskId);
        }
      }
    ]);
  };

  const handleCreateDonation = async () => {
    if (!eventId) {
      return;
    }

    if (!donationForm.donorName.trim()) {
      setFinanceError("Donor name is required.");
      return;
    }

    const amount = Number.parseFloat(donationForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFinanceError("Donation amount must be greater than zero.");
      return;
    }

    setCreatingDonation(true);
    setFinanceError("");

    try {
      await createDonation(eventId, {
        donorName: donationForm.donorName.trim(),
        amount,
        paymentMethod: donationForm.paymentMethod,
        referenceId: donationForm.referenceId.trim() || undefined
      });
      setDonationForm({
        donorName: "",
        amount: "",
        paymentMethod: "CASH",
        referenceId: ""
      });
      await loadScreen();
    } catch (err) {
      setFinanceError(
        err instanceof Error ? err.message : "Failed to record donation."
      );
    } finally {
      setCreatingDonation(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!eventId) {
      return;
    }

    if (!expenseForm.title.trim()) {
      setFinanceError("Expense title is required.");
      return;
    }

    const amount = Number.parseFloat(expenseForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFinanceError("Expense amount must be greater than zero.");
      return;
    }

    setCreatingExpense(true);
    setFinanceError("");

    try {
      await createExpense(eventId, {
        title: expenseForm.title.trim(),
        amount
      });
      setExpenseForm({ title: "", amount: "" });
      await loadScreen();
    } catch (err) {
      setFinanceError(
        err instanceof Error ? err.message : "Failed to record expense."
      );
    } finally {
      setCreatingExpense(false);
    }
  };

  const handleGenerateQr = async () => {
    if (!eventId) {
      return;
    }

    if (!event?.donationUpiId) {
      setFinanceError("Add a donation UPI ID first, then generate the QR.");
      return;
    }

    setLoadingQr(true);
    setFinanceError("");

    try {
      const data = await getDonationQR(eventId);
      setDonationQr(data.qrCode || "");
    } catch (err) {
      setFinanceError(
        err instanceof Error ? err.message : "Unable to generate donation QR."
      );
    } finally {
      setLoadingQr(false);
    }
  };

  const handleVerifyDonation = async (donationId: string) => {
    setVerifyingDonationId(donationId);
    setFinanceError("");

    try {
      await verifyDonation(donationId);
      await loadScreen();
    } catch (err) {
      setFinanceError(
        err instanceof Error ? err.message : "Failed to verify donation."
      );
    } finally {
      setVerifyingDonationId("");
    }
  };

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!eventId) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Missing event</Text>
          <Text style={styles.stateText}>
            This route needs a valid event id.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !event) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading event workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Event unavailable</Text>
          <Text style={styles.stateText}>
            {error || "We could not load this event right now."}
          </Text>
          <Pressable
            onPress={() => router.replace("/events")}
            style={styles.inlineBackButton}
          >
            <Text style={styles.inlineBackButtonText}>Back to events</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadScreen("refresh")}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            {currentMemberRole ? (
              <Text style={styles.roleBadge}>{currentMemberRole}</Text>
            ) : null}
          </View>

          <Text style={styles.heroTitle}>{event.name}</Text>
          <Text style={styles.heroSubtitle}>
            {event.description || "No description yet."}
          </Text>

          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>
              Created by{" "}
              {event.createdBy?.name ||
                event.createdBy?.username ||
                "event owner"}
            </Text>
            <Text style={styles.heroMetaText}>
              Members {members.length} | Tasks {tasks.length}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Members</Text>
            <Text style={styles.statValue}>{members.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tasks</Text>
            <Text style={styles.statValue}>{tasks.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Raised</Text>
            <Text style={styles.statValue}>{formatAmount(raisedAmount)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={styles.statValue}>
              {formatAmount(financeSummary?.balance ?? 0)}
            </Text>
          </View>
        </View>

        {goalAmount ? (
          <View style={styles.goalCard}>
            <View style={styles.goalTopRow}>
              <View style={styles.goalCopy}>
                <Text style={styles.sectionTitle}>Funding goal</Text>
                <Text style={styles.sectionSubtitle}>
                  Verified donations counted against target.
                </Text>
              </View>
              <Text style={styles.goalBadge}>{goalProgress}%</Text>
            </View>
            <View style={styles.goalAmounts}>
              <View style={styles.goalAmountBlock}>
                <Text style={styles.goalAmountLabel}>Goal</Text>
                <Text style={styles.goalAmountValue}>
                  {formatAmount(goalAmount)}
                </Text>
              </View>
              <View style={styles.goalAmountBlock}>
                <Text style={styles.goalAmountLabel}>Raised</Text>
                <Text style={styles.goalAmountValue}>
                  {formatAmount(raisedAmount)}
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${goalProgress}%` }]}
              />
            </View>
          </View>
        ) : null}

        {(canEditEvent || canDeleteEvent) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Event settings</Text>
            <Text style={styles.sectionSubtitle}>
              Update the event, configure UPI, or delete the event you created.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Event name</Text>
              <TextInput
                value={eventForm.name}
                onChangeText={(value) =>
                  setEventForm((prev) => ({ ...prev, name: value }))
                }
                placeholder="Event name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                multiline
                value={eventForm.description}
                onChangeText={(value) =>
                  setEventForm((prev) => ({ ...prev, description: value }))
                }
                placeholder="Short description"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Donation UPI ID</Text>
              <TextInput
                value={eventForm.donationUpiId}
                onChangeText={(value) =>
                  setEventForm((prev) => ({ ...prev, donationUpiId: value }))
                }
                autoCapitalize="none"
                placeholder="name@upi"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Funding goal</Text>
              <TextInput
                value={eventForm.fundingGoal}
                onChangeText={(value) =>
                  setEventForm((prev) => ({ ...prev, fundingGoal: value }))
                }
                keyboardType="numeric"
                placeholder="50000"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.actionRow}>
              {canEditEvent ? (
                <Pressable
                  onPress={handleSaveEvent}
                  disabled={savingEvent}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.actionButton,
                    pressed && styles.primaryButtonPressed,
                    savingEvent && styles.buttonDisabled
                  ]}
                >
                  {savingEvent ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save event</Text>
                  )}
                </Pressable>
              ) : null}

              {canDeleteEvent ? (
                <Pressable
                  onPress={confirmDeleteEvent}
                  disabled={deletingEvent}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    styles.actionButton,
                    pressed && styles.buttonPressed,
                    deletingEvent && styles.buttonDisabled
                  ]}
                >
                  {deletingEvent ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.dangerButtonText}>Delete event</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        {canManageTasks ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quick add task</Text>
            <Text style={styles.sectionSubtitle}>
              Managers can create tasks straight from the event workspace.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Task title</Text>
              <TextInput
                value={taskForm.title}
                onChangeText={(value) =>
                  setTaskForm((prev) => ({ ...prev, title: value }))
                }
                placeholder="Set up stage volunteers"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                multiline
                value={taskForm.description}
                onChangeText={(value) =>
                  setTaskForm((prev) => ({ ...prev, description: value }))
                }
                placeholder="Short description"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              onPress={handleCreateTask}
              disabled={creatingTask}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                creatingTask && styles.buttonDisabled
              ]}
            >
              {creatingTask ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Create task</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <Text style={styles.sectionSubtitle}>
            Assigned members can update status. Managers can assign and delete.
          </Text>

          <View style={styles.taskStatRow}>
            <View style={styles.taskStat}>
              <Text style={styles.taskStatLabel}>Pending</Text>
              <Text style={styles.taskStatValue}>{taskStats.PENDING}</Text>
            </View>
            <View style={styles.taskStat}>
              <Text style={styles.taskStatLabel}>In progress</Text>
              <Text style={styles.taskStatValue}>{taskStats.IN_PROGRESS}</Text>
            </View>
            <View style={styles.taskStat}>
              <Text style={styles.taskStatLabel}>Completed</Text>
              <Text style={styles.taskStatValue}>{taskStats.COMPLETED}</Text>
            </View>
          </View>

          <View style={styles.list}>
            {tasks.length ? (
              tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{task.title}</Text>
                      <Text style={styles.listMeta}>
                        {task.description || "No description"} |{" "}
                        {formatDate(task.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.statusPill}>{task.status}</Text>
                  </View>

                  <ChoiceChips
                    options={TASK_STATUSES}
                    value={task.status}
                    onChange={(nextStatus) => {
                      void handleUpdateTaskStatus(task, nextStatus);
                    }}
                    disabled={updatingTaskId === task.id}
                  />

                  {canManageTasks ? (
                    <View style={styles.manageBlock}>
                      <Text style={styles.helperText}>
                        Assign by typing a username or tapping an event member.
                      </Text>
                      <TextInput
                        value={taskAssignees[task.id] || ""}
                        onChangeText={(value) =>
                          setTaskAssignees((prev) => ({
                            ...prev,
                            [task.id]: value.toLowerCase()
                          }))
                        }
                        autoCapitalize="none"
                        placeholder="member username"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                      />

                      <View style={styles.memberChipWrap}>
                        {memberUsernames.map((username) => (
                          <Pressable
                            key={`${task.id}-${username}`}
                            onPress={() =>
                              setTaskAssignees((prev) => ({
                                ...prev,
                                [task.id]: username
                              }))
                            }
                            style={({ pressed }) => [
                              styles.memberChip,
                              pressed && styles.choiceChipPressed
                            ]}
                          >
                            <Text style={styles.memberChipText}>@{username}</Text>
                          </Pressable>
                        ))}
                      </View>

                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => {
                            void handleAssignTask(task.id);
                          }}
                          disabled={assigningTaskId === task.id}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            styles.actionButton,
                            pressed && styles.buttonPressed,
                            assigningTaskId === task.id && styles.buttonDisabled
                          ]}
                        >
                          {assigningTaskId === task.id ? (
                            <ActivityIndicator color={colors.textHeading} />
                          ) : (
                            <Text style={styles.secondaryButtonText}>
                              Assign task
                            </Text>
                          )}
                        </Pressable>

                        <Pressable
                          onPress={() => confirmDeleteTask(task.id)}
                          disabled={deletingTaskId === task.id}
                          style={({ pressed }) => [
                            styles.dangerGhostButton,
                            styles.actionButton,
                            pressed && styles.buttonPressed,
                            deletingTaskId === task.id && styles.buttonDisabled
                          ]}
                        >
                          {deletingTaskId === task.id ? (
                            <ActivityIndicator color={colors.error} />
                          ) : (
                            <Text style={styles.dangerGhostButtonText}>
                              Delete
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No tasks yet.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Members</Text>
          <Text style={styles.sectionSubtitle}>
            Add members, update their role, or remove them from the event.
          </Text>

          {canManageMembers ? (
            <View style={styles.manageBlock}>
              <View style={styles.field}>
                <Text style={styles.label}>Search by username</Text>
                <TextInput
                  value={memberForm.username}
                  onChangeText={(value) =>
                    setMemberForm((prev) => ({
                      ...prev,
                      username: value.toLowerCase()
                    }))
                  }
                  autoCapitalize="none"
                  placeholder="enter username"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>

              <ChoiceChips
                options={ROLES}
                value={memberForm.role}
                onChange={(nextRole) =>
                  setMemberForm((prev) => ({ ...prev, role: nextRole }))
                }
                disabled={addingMember}
              />

              {memberSearchLoading ? (
                <Text style={styles.helperText}>Searching users...</Text>
              ) : null}

              {memberSearchError ? (
                <Text style={styles.warning}>{memberSearchError}</Text>
              ) : null}

              {memberResults.length ? (
                <View style={styles.searchResults}>
                  {memberResults.slice(0, 5).map((result) => (
                    <Pressable
                      key={result.id}
                      onPress={() =>
                        setMemberForm((prev) => ({
                          ...prev,
                          username: result.username
                        }))
                      }
                      style={({ pressed }) => [
                        styles.searchResultCard,
                        pressed && styles.buttonPressed
                      ]}
                    >
                      <Text style={styles.searchResultTitle}>
                        {result.name || result.username}
                      </Text>
                      <Text style={styles.searchResultMeta}>
                        @{result.username} | {result.email}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={handleAddMember}
                disabled={addingMember}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  addingMember && styles.buttonDisabled
                ]}
              >
                {addingMember ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Add member</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <View style={styles.list}>
            {members.length ? (
              members.map((member) => {
                const username = member.user?.username || "";
                const isCurrentUser = member.user?.id === user?.id;
                const isUpdatingThisMember =
                  updatingMemberUsername === username;
                const isRemovingThisMember =
                  removingMemberUsername === username;

                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>
                        {member.user?.name || username || "Member"}
                      </Text>
                      <Text style={styles.listMeta}>
                        @{username || "username"} |{" "}
                        {member.user?.email || "No email"}
                      </Text>
                    </View>

                    {canManageMembers ? (
                      <View style={styles.memberActions}>
                        <ChoiceChips
                          options={ROLES}
                          value={member.role}
                          onChange={(nextRole) => {
                            void handleUpdateMemberRole(member, nextRole);
                          }}
                          disabled={isUpdatingThisMember || isRemovingThisMember}
                        />

                        {!isCurrentUser ? (
                          <Pressable
                            onPress={() => confirmRemoveMember(username)}
                            disabled={isRemovingThisMember}
                            style={({ pressed }) => [
                              styles.dangerGhostButton,
                              pressed && styles.buttonPressed,
                              isRemovingThisMember && styles.buttonDisabled
                            ]}
                          >
                            {isRemovingThisMember ? (
                              <ActivityIndicator color={colors.error} />
                            ) : (
                              <Text style={styles.dangerGhostButtonText}>
                                Remove
                              </Text>
                            )}
                          </Pressable>
                        ) : (
                          <Text style={styles.helperText}>You</Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.rolePill}>{member.role}</Text>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.mutedText}>No members found.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.financeHeader}>
            <View style={styles.financeHeaderCopy}>
              <Text style={styles.sectionTitle}>Finance</Text>
              <Text style={styles.sectionSubtitle}>
                Record donations and expenses, verify payments, and generate the
                event QR.
              </Text>
            </View>
            {canManageFinance ? (
              <Text style={styles.financeAccess}>Finance access</Text>
            ) : null}
          </View>

          <View style={styles.financeStatsRow}>
            <View style={styles.financeStat}>
              <Text style={styles.financeStatLabel}>Donations</Text>
              <Text style={styles.financeStatValue}>
                {formatAmount(financeSummary?.totalDonations ?? 0)}
              </Text>
            </View>
            <View style={styles.financeStat}>
              <Text style={styles.financeStatLabel}>Expenses</Text>
              <Text style={styles.financeStatValue}>
                {formatAmount(financeSummary?.totalExpenses ?? 0)}
              </Text>
            </View>
          </View>

          {financeError ? <Text style={styles.warning}>{financeError}</Text> : null}

          <View style={styles.upiCard}>
            <Text style={styles.upiLabel}>Donation UPI</Text>
            <Text style={styles.upiValue}>
              {event.donationUpiId || "Not configured yet"}
            </Text>

            {canManageFinance ? (
              <Pressable
                onPress={handleGenerateQr}
                disabled={loadingQr}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                  loadingQr && styles.buttonDisabled
                ]}
              >
                {loadingQr ? (
                  <ActivityIndicator color={colors.textHeading} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Generate QR</Text>
                )}
              </Pressable>
            ) : null}

            {donationQr ? (
              <Image source={{ uri: donationQr }} style={styles.qrImage} />
            ) : null}
          </View>

          {canManageFinance ? (
            <View style={styles.financeForms}>
              <View style={styles.financeFormCard}>
                <Text style={styles.subSectionTitle}>Record donation</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Donor name</Text>
                  <TextInput
                    value={donationForm.donorName}
                    onChangeText={(value) =>
                      setDonationForm((prev) => ({ ...prev, donorName: value }))
                    }
                    placeholder="Donor name"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    value={donationForm.amount}
                    onChangeText={(value) =>
                      setDonationForm((prev) => ({ ...prev, amount: value }))
                    }
                    keyboardType="numeric"
                    placeholder="1000"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Reference ID</Text>
                  <TextInput
                    value={donationForm.referenceId}
                    onChangeText={(value) =>
                      setDonationForm((prev) => ({
                        ...prev,
                        referenceId: value
                      }))
                    }
                    autoCapitalize="none"
                    placeholder="optional reference"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>

                <ChoiceChips
                  options={PAYMENT_METHODS}
                  value={donationForm.paymentMethod}
                  onChange={(nextMethod) =>
                    setDonationForm((prev) => ({
                      ...prev,
                      paymentMethod: nextMethod
                    }))
                  }
                  disabled={creatingDonation}
                />

                <Pressable
                  onPress={handleCreateDonation}
                  disabled={creatingDonation}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    creatingDonation && styles.buttonDisabled
                  ]}
                >
                  {creatingDonation ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save donation</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.financeFormCard}>
                <Text style={styles.subSectionTitle}>Record expense</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    value={expenseForm.title}
                    onChangeText={(value) =>
                      setExpenseForm((prev) => ({ ...prev, title: value }))
                    }
                    placeholder="Expense title"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    value={expenseForm.amount}
                    onChangeText={(value) =>
                      setExpenseForm((prev) => ({ ...prev, amount: value }))
                    }
                    keyboardType="numeric"
                    placeholder="500"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>

                <Pressable
                  onPress={handleCreateExpense}
                  disabled={creatingExpense}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    creatingExpense && styles.buttonDisabled
                  ]}
                >
                  {creatingExpense ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save expense</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={styles.subSectionTitle}>Recent donations</Text>
          <View style={styles.list}>
            {donations.length ? (
              donations.map((donation) => (
                <View key={donation.id} style={styles.listItem}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>
                      {donation.donorName || "Anonymous donor"}
                    </Text>
                    <Text style={styles.listMeta}>
                      {donation.paymentMethod || "Payment"} |{" "}
                      {formatDate(donation.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.amountBlock}>
                    <Text style={styles.positiveAmount}>
                      +{formatAmount(donation.amount)}
                    </Text>
                    <Text style={styles.listMeta}>
                      {donation.status || "SUCCESS"}
                    </Text>
                    {canManageFinance && donation.status === "PENDING" ? (
                      <Pressable
                        onPress={() => {
                          void handleVerifyDonation(donation.id);
                        }}
                        disabled={verifyingDonationId === donation.id}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          pressed && styles.buttonPressed,
                          verifyingDonationId === donation.id &&
                            styles.buttonDisabled
                        ]}
                      >
                        {verifyingDonationId === donation.id ? (
                          <ActivityIndicator color={colors.textHeading} />
                        ) : (
                          <Text style={styles.secondaryButtonText}>Verify</Text>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No donations yet.</Text>
            )}
          </View>

          <Text style={styles.subSectionTitle}>Recent expenses</Text>
          <View style={styles.list}>
            {expenses.length ? (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.listItem}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{expense.title}</Text>
                    <Text style={styles.listMeta}>
                      {expense.user?.username
                        ? `@${expense.user.username}`
                        : expense.user?.name || "member"}{" "}
                      | {formatDate(expense.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.negativeAmount}>
                    -{formatAmount(expense.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No expenses yet.</Text>
            )}
          </View>
        </View>
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
  stateCard: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card
  },
  stateTitle: {
    color: colors.textHeading,
    fontSize: 22,
    fontWeight: "800"
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  inlineBackButton: {
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primarySoft
  },
  inlineBackButtonText: {
    color: colors.textHeading,
    fontWeight: "700"
  },
  hero: {
    backgroundColor: colors.hero,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.heroBorder
  },
  backButtonText: {
    color: colors.white,
    fontWeight: "700"
  },
  roleBadge: {
    backgroundColor: colors.heroBadge,
    color: colors.white,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800"
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
  heroMeta: {
    gap: 4
  },
  heroMetaText: {
    color: colors.railText,
    fontSize: 13
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
  warning: {
    backgroundColor: colors.primarySoft,
    color: colors.textHeading,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    ...shadow.card
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  statValue: {
    color: colors.textHeading,
    fontSize: 20,
    fontWeight: "800"
  },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card
  },
  goalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md
  },
  goalCopy: {
    flex: 1,
    gap: 4
  },
  goalBadge: {
    backgroundColor: colors.accent,
    color: colors.white,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: "800"
  },
  sectionTitle: {
    color: colors.textHeading,
    fontSize: 22,
    fontWeight: "800"
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },
  goalAmounts: {
    flexDirection: "row",
    gap: spacing.md
  },
  goalAmountBlock: {
    flex: 1,
    gap: 6
  },
  goalAmountLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  goalAmountValue: {
    color: colors.textHeading,
    fontSize: 18,
    fontWeight: "800"
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cardMuted,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card
  },
  financeFormCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md
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
    minHeight: 96
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryButtonPressed: {
    opacity: 0.92
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800"
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
  dangerButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  dangerButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800"
  },
  dangerGhostButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  dangerGhostButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "800"
  },
  buttonPressed: {
    opacity: 0.9
  },
  buttonDisabled: {
    opacity: 0.7
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1
  },
  taskStatRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  taskStat: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    gap: 6
  },
  taskStatLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  taskStatValue: {
    color: colors.textHeading,
    fontSize: 20,
    fontWeight: "800"
  },
  list: {
    gap: spacing.sm
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 4
  },
  listCopy: {
    flex: 1,
    gap: 4
  },
  listTitle: {
    color: colors.textHeading,
    fontSize: 16,
    fontWeight: "700"
  },
  listMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  choiceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  choiceChipPressed: {
    opacity: 0.92
  },
  choiceChipDisabled: {
    opacity: 0.6
  },
  choiceChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  choiceChipTextActive: {
    color: colors.white
  },
  statusPill: {
    backgroundColor: colors.primarySoft,
    color: colors.textHeading,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
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
  taskCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  manageBlock: {
    gap: spacing.sm
  },
  memberChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  memberChip: {
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  memberChipText: {
    color: colors.textHeading,
    fontSize: 12,
    fontWeight: "700"
  },
  memberCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  memberActions: {
    gap: spacing.sm
  },
  searchResults: {
    gap: 8
  },
  searchResultCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  searchResultTitle: {
    color: colors.textHeading,
    fontSize: 15,
    fontWeight: "700"
  },
  searchResultMeta: {
    color: colors.textSecondary,
    fontSize: 13
  },
  financeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  financeHeaderCopy: {
    flex: 1,
    gap: 4
  },
  financeAccess: {
    backgroundColor: colors.hero,
    color: colors.white,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800"
  },
  financeStatsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  financeStat: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    gap: 6
  },
  financeStatLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  financeStatValue: {
    color: colors.textHeading,
    fontSize: 18,
    fontWeight: "800"
  },
  financeForms: {
    gap: spacing.md
  },
  subSectionTitle: {
    color: colors.textHeading,
    fontSize: 17,
    fontWeight: "800"
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 6
  },
  positiveAmount: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "800"
  },
  negativeAmount: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "800"
  },
  upiCard: {
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    gap: spacing.sm
  },
  upiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  upiValue: {
    color: colors.textHeading,
    fontSize: 16,
    fontWeight: "700"
  },
  qrImage: {
    width: 220,
    height: 220,
    alignSelf: "center",
    borderRadius: 16
  }
});
