import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text
} from "react-native";
import { colors, spacing } from "@/src/theme";

type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({
  label = "Preparing the app..."
}: LoadingScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.label}>{label}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.ink
  },
  label: {
    color: colors.railText,
    fontSize: 15
  }
});
