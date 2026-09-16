import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/services/api";
import type { DashboardMetrics } from "@/services/types";

export default function DashboardScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setMetrics(await api.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Fitness AI Tracker</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {metrics && (
        <View style={styles.grid}>
          <StatCard label="Sets logged" value={metrics.total_sets} />
          <StatCard label="Sessions" value={metrics.total_sessions} />
          <StatCard label="Exercises" value={metrics.total_exercises} />
          <StatCard label="Streak" value={`${metrics.streak_days} days`} />
          <StatCard label="Total volume" value={`${metrics.total_volume_tonnes} t`} />
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  error: { color: "#b00020" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexBasis: "47%",
    backgroundColor: "#f2f2f7",
    borderRadius: 12,
    padding: 16,
  },
  cardValue: { fontSize: 22, fontWeight: "700" },
  cardLabel: { fontSize: 13, color: "#666", marginTop: 4 },
});
