import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { FeedType } from "@/context/AppContext";

const FEED_TYPES: FeedType[] = ["For You", "Following", "Trending", "Latest"];

interface FeedTabsProps {
  active: FeedType;
  onChange: (feed: FeedType) => void;
}

export function FeedTabs({ active, onChange }: FeedTabsProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {FEED_TYPES.map(feed => {
          const isActive = feed === active;
          return (
            <TouchableOpacity
              key={feed}
              onPress={() => onChange(feed)}
              style={[styles.tab, isActive && styles.activeTab]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {feed}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    wrapper: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 16,
      paddingVertical: 0,
      gap: 4,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      marginBottom: -1,
    },
    activeTab: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    activeTabText: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
