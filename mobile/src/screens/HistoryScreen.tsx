import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { api } from "@/services/api";
import type { WorkoutSet } from "@/services/types";

export default function HistoryScreen() {
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSets()
      .then(setSets)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    api
      .exercises()
      .then((list) => setExercises(["All", ...list]))
      .catch(() => {});
  }, []);

  const filtered = filter === "All" ? sets : sets.filter((s) => s.exercise === filter);

  return (
    <View style={styles.container}>
      <Picker selectedValue={filter} onValueChange={setFilter}>
        {exercises.map((name) => (
          <Picker.Item key={name} label={name} value={name} />
        ))}
      </Picker>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.exercise}</Text>
            <Text style={styles.rowSub}>
              {item.workout_date} · set {item.set_number} · {item.weight}kg x {item.reps}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No sets logged yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  error: { color: "#b00020", marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSub: { fontSize: 13, color: "#666", marginTop: 2 },
  empty: { textAlign: "center", color: "#999", marginTop: 32 },
});
