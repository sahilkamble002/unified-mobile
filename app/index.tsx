import { Redirect } from "expo-router";
import { LoadingScreen } from "@/src/components/LoadingScreen";
import { useAuth } from "@/src/context/AuthContext";

export default function IndexScreen() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen label="Loading workspace..." />;
  }

  return <Redirect href={isAuthenticated ? "/events" : "/login"} />;
}
