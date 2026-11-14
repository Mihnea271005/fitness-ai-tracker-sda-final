import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import ExercisePicker from "@/components/ExercisePicker";
import { api } from "@/services/api";
import type { NewWorkoutSet } from "@/services/types";

const PROP_SESSIONS = 8;
const PROP_SESSION_GAP_DAYS = 7;
const PROP_NOTE = "Prop data — added for testing AI Coach";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Generates a short, realistic session history (progressive overload) so the
 * AI model has enough sessions to train and predict on right away. */
function buildPropSets(exercise: string): NewWorkoutSet[] {
  const sets: NewWorkoutSet[] = [];
  for (let session = 0; session < PROP_SESSIONS; session += 1) {
    const daysAgo = (PROP_SESSIONS - 1 - session) * PROP_SESSION_GAP_DAYS;
    const baseWeight = 40 + session * 2.5;
    for (let setNumber = 1; setNumber <= 2; setNumber += 1) {
      sets.push({
        workout_date: isoDaysAgo(daysAgo),
        exercise,
        set_number: setNumber,
        reps: setNumber === 1 ? 8 : 7,
        weight: baseWeight,
        notes: PROP_NOTE,
      });
    }
  }
  return sets;
}

export default function LogWorkoutScreen() {
  const [exercises, setExercises] = useState<string[]>([]);
  const [exercise, setExercise] = useState<string>("");
  const [workoutDate, setWorkoutDate] = useState(todayIso());
  const [setNumber, setSetNumber] = useState("1");
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("40");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingProp, setAddingProp] = useState(false);

  useEffect(() => {
    api
      .exercises()
      .then((list) => {
        setExercises(list);
        if (list.length > 0) setExercise(list[0]);
      })
      .catch(() => {
        // Swallowed: picker just stays empty, save button below still guards on `exercise`.
      });
  }, []);

  const onSave = async () => {
    if (!exercise) {
      Alert.alert("Pick an exercise first.");
      return;
    }
    setSaving(true);
    try {
      await api.createSet({
        workout_date: workoutDate,
        exercise,
        set_number: Number(setNumber),
        reps: Number(reps),
        weight: Number(weight),
        notes,
      });
      Alert.alert("Saved", `${exercise} — ${weight}kg x ${reps}`);
      setNotes("");
    } catch (err) {
      Alert.alert("Failed to save", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const onAddProp = async () => {
    if (!exercise) {
      Alert.alert("Pick an exercise first.");
      return;
    }
    setAddingProp(true);
    try {
      const propSets = buildPropSets(exercise);
      for (const set of propSets) {
        await api.createSet(set);
      }
      const trainResult = await api.trainModel();
      Alert.alert(
        "Prop data added",
        `Added ${propSets.length} sample sets across ${PROP_SESSIONS} sessions for ${exercise}. ${trainResult.message}\n\nOpen AI Coach and pick "${exercise}" to see a prediction.`,
      );
    } catch (err) {
      Alert.alert("Failed to add prop data", err instanceof Error ? err.message : String(err));
    } finally {
      setAddingProp(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={workoutDate} onChangeText={setWorkoutDate} />

      <ExercisePicker label="Exercise" exercises={exercises} value={exercise} onChange={setExercise} />

      <View style={styles.propRow}>
        <Button
          title={addingProp ? "Adding prop data..." : "Add prop workout set"}
          onPress={onAddProp}
          disabled={addingProp || !exercise}
        />
        <Text style={styles.propHint}>
          Adds a short sample history for the selected exercise so you can test AI Coach right away.
        </Text>
      </View>

      <Text style={styles.label}>Set #</Text>
      <TextInput style={styles.input} value={setNumber} onChangeText={setSetNumber} keyboardType="number-pad" />

      <Text style={styles.label}>Reps</Text>
      <TextInput style={styles.input} value={reps} onChangeText={setReps} keyboardType="number-pad" />

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} />

      <Button title={saving ? "Saving..." : "Save set"} onPress={onSave} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4 },
  label: { fontSize: 13, color: "#666", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  propRow: {
    marginTop: 16,
    gap: 6,
    padding: 12,
    backgroundColor: "#f4f4f4",
    borderRadius: 8,
  },
  propHint: { fontSize: 12, color: "#777" },
});
