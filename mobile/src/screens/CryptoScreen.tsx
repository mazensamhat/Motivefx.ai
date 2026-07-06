import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { API_BASE, colors } from "../theme";

interface Whale {
  asset: string;
  amountUsd: number;
  note?: string;
  direction: string;
}

export function CryptoScreen() {
  const [items, setItems] = useState<Whale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/crypto/whale-alerts`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
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
          <Text style={styles.title}>
            {item.asset} · ${(item.amountUsd / 1_000_000).toFixed(1)}M
          </Text>
          {item.note && <Text style={styles.sub}>{item.note}</Text>}
          <Text style={[styles.badge, item.direction === "deposit" ? styles.bear : styles.bull]}>
            {item.direction}
          </Text>
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
  badge: { fontSize: 11, fontWeight: "600", marginTop: 8, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: "hidden" },
  bull: { color: colors.green, backgroundColor: "rgba(52,211,153,0.15)" },
  bear: { color: colors.red, backgroundColor: "rgba(248,113,113,0.15)" },
});
