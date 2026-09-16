import { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const MAX_RESULTS = 8;

interface ExercisePickerProps {
  exercises: string[];
  value: string;
  onChange: (exercise: string) => void;
  label?: string;
}

export default function ExercisePicker({ exercises, value, onChange, label }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const matches = exercises
    .filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, MAX_RESULTS);

  const showDropdown = focused && exercises.length > 0;

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      {value && !showDropdown && (
        <TouchableOpacity style={styles.selected} onPress={() => setFocused(true)}>
          <Text style={styles.selectedText}>{value}</Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      )}
      {(showDropdown || !value) && (
        <>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            placeholder="Search exercises..."
            autoCorrect={false}
          />
          {showDropdown && (
            <View style={styles.dropdown}>
              {matches.length === 0 ? (
                <Text style={styles.empty}>No exercises match "{query}"</Text>
              ) : (
                <FlatList
                  data={matches}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.row} onPress={() => select(item)}>
                      <Text style={styles.rowText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, color: "#666" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  selected: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedText: { fontSize: 16, fontWeight: "600" },
  changeText: { fontSize: 13, color: "#2f6f4f" },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    maxHeight: 220,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowText: { fontSize: 15 },
  empty: { padding: 12, color: "#999" },
});
