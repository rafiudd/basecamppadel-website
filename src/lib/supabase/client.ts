/**
 * Browser-safe client adapter for MongoDB-backed features.
 */

export function createClient(): any {
  return {
    from: (table: string) => ({
      select: (fields?: string) => ({
        eq: (col: string, val: any) => ({
          order: () => ({
            limit: (n: number) => ({
              maybeSingle: async () => {
                if (table === "matches") {
                  const res = await fetch(`/api/live/match?${col}=${encodeURIComponent(val)}`);
                  if (res.ok) {
                    const json = await res.json();
                    return { data: json.match, error: null };
                  }
                }
                return { data: null, error: null };
              },
            }),
          }),
          maybeSingle: async () => {
            if (table === "matches") {
              const res = await fetch(`/api/live/match?${col}=${encodeURIComponent(val)}`);
              if (res.ok) {
                const json = await res.json();
                return { data: json.match, error: null };
              }
            }
            return { data: null, error: null };
          },
        }),
        limit: (n: number) => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      update: (patch: Record<string, any>) => ({
        eq: async (col: string, val: any) => {
          if (table === "matches" && col === "id") {
            try {
              const res = await fetch("/api/matches/update", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id: val, patch }),
              });
              const json = await res.json();
              if (!res.ok) {
                return { error: { message: json.error || "Update failed" } };
              }
              return { error: null };
            } catch (e: any) {
              return { error: { message: e.message } };
            }
          }
          return { error: null };
        },
      }),
    }),

    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const json = await res.json();
          if (!res.ok) {
            return { error: { message: json.error || "Login gagal" } };
          }
          return { data: json.user, error: null };
        } catch (e: any) {
          return { error: { message: e.message } };
        }
      },

      signInWithOtp: async ({ email }: { email: string }) => {
        return { error: { message: "Magic link tidak tersedia dalam mode MongoDB. Silakan gunakan password." } };
      },

      signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => {
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (sbUrl) {
          const redirect = options?.redirectTo ? encodeURIComponent(options.redirectTo) : "";
          window.location.href = `${sbUrl}/auth/v1/authorize?provider=google&redirect_to=${redirect}&prompt=select_account`;
          return { error: null };
        }
        return { error: { message: "Google OAuth provider belum dikonfigurasi." } };
      },

      signOut: async () => {
        try {
          await fetch("/api/auth/signout", { method: "POST" });
        } catch {
          // ignore
        }
        return { error: null };
      },

      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        let isMounted = true;
        fetch("/api/auth/me")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!isMounted) return;
            if (data?.user) {
              callback("SIGNED_IN", {
                user: {
                  ...data.user,
                  user_metadata: data.user.user_metadata || {},
                },
              });
            } else {
              callback("SIGNED_OUT", null);
            }
          })
          .catch(() => {
            if (isMounted) callback("SIGNED_OUT", null);
          });

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                isMounted = false;
              },
            },
          },
        };
      },
    },

    channel: (name: string) => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    }),

    removeChannel: () => {},
  };
}
