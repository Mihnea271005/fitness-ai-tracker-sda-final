import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { api } from "@/services/api";
import type { PersonalRecord } from "@/services/types";

export default function RecordsScreen() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .personalRecords()
      .then(setRecords)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={records}
        keyExtractor={(item) => item.exercise}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.exercise}</Text>
            <Text style={styles.rowSub}>
              {item.max_weight} kg · {item.achieved_on} · {item.muscle_group ?? "—"}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No records yet.</Text>}
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
