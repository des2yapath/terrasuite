/**
 * Thin wrapper over supabase.functions.invoke used by ALL edge-function
 * callers (Modules 05, 06, 09). Two jobs:
 *  1. Normalize errors — supabase-js returns errors instead of throwing;
 *     we throw so callers can use try/catch naturally.
 *  2. Guarantee the session JWT is attached — supabase-js does this
 *     automatically for signed-in users, which is what allows Module 15
 *     to flip verify_jwt = true on every function except gee-tile-proxy.
 *
 * Retry/backoff variant (invokeWithRetry) arrives in Module 06 and wraps this.
 */
import { supabase } from "@/integrations/supabase/client";

export class FunctionError extends Error {
  constructor(
    message: string,
    public fnName: string,
  ) {
    super(message);
    this.name = "FunctionError";
  }
}

export async function invokeFn<T = unknown>(
  fnName: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fnName, { body });
  if (error) {
    // 401/403 surface here when verify_jwt=true and the session is dead.
    throw new FunctionError(error.message, fnName);
  }
  return data as T;
}
