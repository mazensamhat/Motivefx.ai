import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { API_BASE, colors } from "../theme";

interface Option {
  symbol: string;
  type: string;
  strike?: number;
  note?: string;
  premium?: number;
}

export function StocksScreen() {
  const [items, setItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/stocks/unusual-options`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

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
      data={items}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>${item.symbol} {item.type.toUpperCase()}</Text>
          <Text style={styles.sub}>Strike ${item.strike} · ${item.premium?.toFixed(2)}</Text>
          {item.note && <Text style={styles.note}>{item.note}</Text>}
        </View>
      )}
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
  note: { fontSize: 12, color: colors.dim, marginTop: 6 },
});
