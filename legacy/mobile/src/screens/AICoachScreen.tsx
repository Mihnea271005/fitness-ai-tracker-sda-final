import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, StyleSheet, Text, View } from "react-native";

import ExercisePicker from "@/components/ExercisePicker";
import { api } from "@/services/api";
import type { PredictionResult, StagnationResult } from "@/services/types";

export default function AICoachScreen() {
  const [exercises, setExercises] = useState<string[]>([]);
  const [exercise, setExercise] = useState<string>("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [stagnation, setStagnation] = useState<StagnationResult | null>(null);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .exercises()
      .then((list) => {
        setExercises(list);
        if (list.length > 0) setExercise(list[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!exercise) return;
    setError(null);
    api
      .predict(exercise)
      .then(setPrediction)
      .catch((err) => {
        setPrediction(null);
        setError(err instanceof Error ? err.message : String(err));
      });
    api
      .stagnation(exercise)
      .then(setStagnation)
      .catch(() => setStagnation(null));
  }, [exercise]);

  const onTrain = async () => {
    setTraining(true);
    try {
      const result = await api.trainModel();
      Alert.alert(result.trained ? "Model trained" : "Training skipped", result.message);
    } catch (err) {
      Alert.alert("Training failed", err instanceof Error ? err.message : String(err));
    } finally {
      setTraining(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title={training ? "Training..." : "Train AI model"} onPress={onTrain} disabled={training} />

      <ExercisePicker exercises={exercises} value={exercise} onChange={setExercise} />

      {error && <Text style={styles.error}>{error}</Text>}

      {stagnation && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {stagnation.is_declining
              ? "Fatigue detected — weight dropped last session."
              : stagnation.is_stagnating
                ? `Stagnating over ${stagnation.sessions_checked} sessions (trend ${stagnation.trend.toFixed(1)} kg/session).`
                : `Trend: ${stagnation.trend >= 0 ? "+" : ""}${stagnation.trend.toFixed(1)} kg/session.`}
          </Text>
        </View>
      )}

      {prediction && (
        <View style={styles.predictionCard}>
          <Text style={styles.predictionLabel}>Suggested next session</Text>
          <Text style={styles.predictionValue}>
            {prediction.suggested_weight} kg x {prediction.suggested_reps.toFixed(0)} reps
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  error: { color: "#b00020" },
  banner: { backgroundColor: "#fff3cd", borderRadius: 8, padding: 12 },
  bannerText: { color: "#7a5c00" },
  predictionCard: { backgroundColor: "#e6f4ea", borderRadius: 12, padding: 16 },
  predictionLabel: { fontSize: 13, color: "#2a6b3f" },
  predictionValue: { fontSize: 22, fontWeight: "700", color: "#1f5c33", marginTop: 4 },
});
