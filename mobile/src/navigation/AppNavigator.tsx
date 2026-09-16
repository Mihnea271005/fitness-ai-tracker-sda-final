import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import AICoachScreen from "@/screens/AICoachScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import LogWorkoutScreen from "@/screens/LogWorkoutScreen";
import RecordsScreen from "@/screens/RecordsScreen";

export type RootTabParamList = {
  Dashboard: undefined;
  LogWorkout: undefined;
  History: undefined;
  AICoach: undefined;
  Records: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerTitleAlign: "center" }}>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="LogWorkout" component={LogWorkoutScreen} options={{ title: "Log Workout" }} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="AICoach" component={AICoachScreen} options={{ title: "AI Coach" }} />
        <Tab.Screen name="Records" component={RecordsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
