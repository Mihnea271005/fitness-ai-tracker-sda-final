import { AppShell } from "@/components/shell/app-shell";
import { WorkoutProvider } from "@/components/workout/workout-context";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <WorkoutProvider>
      <AppShell>{children}</AppShell>
    </WorkoutProvider>
  );
}
