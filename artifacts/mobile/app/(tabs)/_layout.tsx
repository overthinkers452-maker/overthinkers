import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

const TAB_BAR_CONTENT_HEIGHT = 56;

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="latenight">
        <Icon sf={{ default: "moon.stars", selected: "moon.stars.fill" }} />
        <Label>4 AM</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <Icon sf={{ default: "safari", selected: "safari.fill" }} />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { unreadCount } = useApp();

  const tabBarHeight = isWeb ? 84 : TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const tabBarPaddingBottom = isWeb ? 16 : insets.bottom + 6;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginTop: 1,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      {/* 1 — Feed */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "house.fill" : "house"} tintColor={color} size={21} />
            ) : (
              <Feather name="home" size={21} color={color} />
            ),
        }}
      />

      {/* 2 — 4 AM */}
      <Tabs.Screen
        name="latenight"
        options={{
          title: "4 AM",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "moon.stars.fill" : "moon.stars"} tintColor={color} size={21} />
            ) : (
              <Text style={{ fontSize: 18, color: focused ? "#C4B5FD" : color }}>
                {focused ? "🌙" : "🌑"}
              </Text>
            ),
          tabBarActiveTintColor: "#C4B5FD",
        }}
      />

      {/* 3 — Search */}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={21} />
            ) : (
              <Feather name="search" size={21} color={color} />
            ),
        }}
      />

      {/* 4 — Discover */}
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "safari.fill" : "safari"} tintColor={color} size={21} />
            ) : (
              <Feather name="compass" size={21} color={color} />
            ),
        }}
      />

      {/* 5 — Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "person.circle.fill" : "person.circle"} tintColor={color} size={21} />
            ) : (
              <Feather name="user" size={21} color={color} />
            ),
        }}
      />

      {/* Hidden — Notifications (navigable but not shown in tab bar) */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Alerts",
          tabBarIcon: ({ color }) => <Feather name="bell" size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
