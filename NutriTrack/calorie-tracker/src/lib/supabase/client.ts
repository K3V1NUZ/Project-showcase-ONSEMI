import { createBrowserClient } from "@supabase/ssr";
import { createDemoClient, isDemoMode } from "./demo";

function createRealClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createClient() {
  // No Supabase credentials configured → run fully in the browser on
  // localStorage (see ./demo.ts). Lets the app run right after cloning.
  if (isDemoMode()) {
    return createDemoClient() as unknown as ReturnType<typeof createRealClient>;
  }
  return createRealClient();
}
