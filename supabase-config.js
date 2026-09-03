(() => {
  const configuredSupabaseUrl =
    "https://grdlolsmlxhvnwixbsai.supabase.co";

  const configuredSupabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZGxvbHNtbHhodm53aXhic2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjY1OTQsImV4cCI6MjEwMTY0MjU5NH0.AY2MN9fFtq_jW_NDeRL6xFM1JgBz5vELCz4qBMCHSIE";

  const supabaseUrl =
    window.SUPABASE_URL || configuredSupabaseUrl;

  const supabaseAnonKey =
    window.SUPABASE_ANON_KEY || configuredSupabaseAnonKey;

  window.__SUPABASE_CONFIG__ = {
    url: supabaseUrl,
    anonKey: supabaseAnonKey
  };

  window.supabaseClient = null;

  const hasValidConfiguration =
    typeof supabaseUrl === "string" &&
    typeof supabaseAnonKey === "string" &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey.startsWith("eyJ") &&
    !supabaseUrl.includes("YOUR_PROJECT_REF") &&
    !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

  function saveUser(user) {
    if (!user?.id || !user?.email) {
      return;
    }

    localStorage.setItem(
      "quiletUser",
      JSON.stringify({
        id: user.id,
        email: user.email,
        name:
          user.user_metadata?.display_name ||
          user.user_metadata?.name ||
          user.email.split("@")[0]
      })
    );
  }

  if (
    window.supabase &&
    typeof window.supabase.createClient === "function" &&
    hasValidConfiguration
  ) {
    window.supabaseClient = window.supabase.createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      }
    );

    window.__SUPABASE_CLIENT__ = window.supabaseClient;
    window.__QUILET_SUPABASE_CLIENT__ = window.supabaseClient;

    window.supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        saveUser(session?.user || null);
      }
    );
  } else if (!hasValidConfiguration) {
    console.warn(
      "Supabase is disabled. Set the project URL and anon public key in supabase-config.js."
    );
  } else {
    console.error(
      "The Supabase library was not loaded before supabase-config.js."
    );
  }

  window.restoreSupabaseAccount = async function restoreSupabaseAccount() {
    if (!window.supabaseClient) {
      return null;
    }

    const { data, error } =
      await window.supabaseClient.auth.getSession();

    if (error) {
      console.error("Could not restore Supabase account:", error);
      return null;
    }

    const user = data?.session?.user || null;
    saveUser(user);
    return user;
  };

  window.supabaseSessionReady =
    window.restoreSupabaseAccount();
})();
