import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { apiGet } from "../lib/api";
import { colors } from "../theme";

interface LiveEvent {
  type: string;
  message: string;
}

export function HomeScreen() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ events: LiveEvent[] }>("/live-feed");
      setEvents(data.events ?? []);
    } catch {
      setEvents([{ type: "info", message: "Connect to backend or sign in" }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={events}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.header}>Live Smart Money Feed</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.tag}>{item.type.toUpperCase()}</Text>
          <Text style={styles.message}>{item.message}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  header: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  tag: { fontSize: 10, fontWeight: "600", color: colors.accent, letterSpacing: 1, marginBottom: 6 },
  message: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
