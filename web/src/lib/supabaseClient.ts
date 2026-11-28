import { createClient } from "@supabase/supabase-js";
import { z } from "zod/mini";

const publicConfig = z.object({
  url: z.url({ protocol: /^https?$/ }),
  key: z.string().check(z.minLength(1)),
});

const config = z.safeParse(publicConfig, {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export const supabase = config.success
  ? createClient(config.data.url, config.data.key)
  : null;
