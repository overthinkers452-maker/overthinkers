import { useColorScheme } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

export function useColors() {
  const { themeMode } = useTheme();
  const systemScheme = useColorScheme();
  const effectiveScheme = themeMode === "auto" ? systemScheme : themeMode;
  const palette =
    effectiveScheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return palette;
}
