import { useState, useEffect } from "react";
import { authService, type AuthState } from "../services/auth";

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: authService.user,
    loading: authService.loading,
  });

  useEffect(() => {
    const unsub = authService.subscribe(setState);
    return unsub;
  }, []);

  return state;
}
