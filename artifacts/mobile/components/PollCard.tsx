import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Thought, useApp } from "@/context/AppContext";
import { formatCount, timeUntil } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";

interface PollCardProps {
  thought: Thought;
}

export function PollCard({ thought }: PollCardProps) {
  const colors = useColors();
  const { votePoll } = useApp();
  const { select } = useFeedback();
  const poll = thought.poll!;
  const hasVoted = poll.userVote !== undefined;
  const isManual = poll.expiresAt === null;
  const isExpired = !isManual && new Date(poll.expiresAt!) < new Date();

  const onVote = useCallback((index: number) => {
    if (hasVoted || isExpired) return;
    select();
    votePoll(thought.id, index);
  }, [hasVoted, isExpired, thought.id, votePoll, select]);

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {poll.options.map((option, index) => {
        const pct = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
        const isWinner = hasVoted && option.votes === Math.max(...poll.options.map(o => o.votes));
        const isMyVote = poll.userVote === index;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => onVote(index)}
            disabled={hasVoted || isExpired}
            style={styles.optionContainer}
            activeOpacity={0.8}
          >
            <View style={[
              styles.optionBar,
              {
                borderColor: isMyVote ? colors.primary : colors.border,
                backgroundColor: colors.secondary,
              }
            ]}>
              {hasVoted && (
                <View style={[
                  styles.fillBar,
                  {
                    width: `${pct}%` as any,
                    backgroundColor: isMyVote ? colors.primary + "30" : colors.muted,
                  }
                ]} />
              )}
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionText,
                  { color: isMyVote ? colors.primary : colors.foreground }
                ]}>
                  {option.text}
                </Text>
                {hasVoted && (
                  <Text style={[
                    styles.pctText,
                    { color: isWinner ? colors.primary : colors.mutedForeground }
                  ]}>
                    {Math.round(pct)}%
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.pollMeta}>
        {formatCount(poll.totalVotes)} votes · {isManual ? "Open until deleted" : isExpired ? "Poll closed" : timeUntil(poll.expiresAt!) + " left"}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      gap: 6,
      marginBottom: 12,
    },
    optionContainer: {},
    optionBar: {
      borderWidth: 1,
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
    },
    fillBar: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      borderRadius: 8,
    },
    optionContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    optionText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    pctText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      marginLeft: 8,
    },
    pollMeta: {
      fontSize: 12,
      color: "#7A7A90",
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
  });
}
