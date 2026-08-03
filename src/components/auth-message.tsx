import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/app/(auth)/actions";

export function AuthMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {state.success}
      </p>
    );
  }
  return null;
}
