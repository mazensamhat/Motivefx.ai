import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { API_BASE, colors } from "../theme";

interface LineMove {
  matchup: string;
  openingLine?: string;
  currentLine?: string;
  movement?: string;
}

interface Sharp {
  matchup: string;
  publicPct: number;
  moneyPct: number;
  sharpSide: string;
}

export function BettingScreen() {
  const [lines, setLines] = useState<LineMove[]>([]);
  const [sharp, setSharp] = useState<Sharp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/betting/line-moves`).then((r) => r.json()),
      fetch(`${API_BASE}/betting/sharp-action`).then((r) => r.json()),
    ])
      .then(([l, s]) => {
        setLines(l.items ?? []);
        setSharp(s.items ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const data = [
    ...lines.map((l) => ({ kind: "line" as const, ...l })),
    ...sharp.map((s) => ({ kind: "sharp" as const, ...s })),
  ];

  return (
    <FlatList
      style={styles.container}
      data={data}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) =>
        item.kind === "line" ? (
          <View style={styles.card}>
            <Text style={styles.title}>{item.matchup}</Text>
            <Text style={styles.sub}>
              {item.openingLine} → {item.currentLine} ({item.movement})
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{item.matchup}</Text>
            <Text style={styles.sub}>
              Public {item.publicPct}% · Money {item.moneyPct}%
            </Text>
            <Text style={styles.sharp}>Sharp: {item.sharpSide}</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  sharp: { fontSize: 12, color: colors.accent, marginTop: 6 },
});
