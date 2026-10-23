import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { useAuth } from "@/auth/useAuth";

/* ------------------------------------------------------------------ */
/* Mock the supabase client — every auth path goes through these fns.  */
/* ------------------------------------------------------------------ */
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => mockGetSession(...(a as [])),
      onAuthStateChange: (...a: unknown[]) => mockOnAuthStateChange(...(a as [])),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

function Probe() {
  const { user, loading } = useAuth();
  return <div data-testid="probe">{loading ? "loading" : user ? `user:${user.email}` : "anon"}</div>;
}

function PublicLogin() {
  return <div data-testid="login">login page</div>;
}

function Guarded() {
  return <div data-testid="guarded">workspace</div>;
}

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function renderAuthTree(sessionUser: { id: string; email: string } | null) {
  mockGetSession.mockResolvedValue({
    data: { session: sessionUser ? { user: sessionUser } : null },
  });
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicLogin />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Guarded />} />
          </Route>
        </Routes>
        <Probe />
        <Where />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("starts loading, resolves to anon when no session", async () => {
    renderAuthTree(null);
    expect(screen.getByTestId("probe").textContent).toBe("loading");
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("anon");
    });
  });

  it("resolves to the session user when signed in", async () => {
    renderAuthTree({ id: "u1", email: "a@b.com" });
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("user:a@b.com");
    });
  });
});

describe("RequireAuth", () => {
  it("redirects anonymous users to /login (preserving origin)", async () => {
    renderAuthTree(null);
    await waitFor(() => {
      expect(screen.getByTestId("where").textContent).toBe("/login");
    });
    expect(screen.queryByTestId("guarded")).toBeNull();
    expect(screen.getByTestId("login")).toBeDefined();
  });

  it("renders guarded content for signed-in users", async () => {
    renderAuthTree({ id: "u1", email: "a@b.com" });
    await waitFor(() => {
      expect(screen.getByTestId("guarded")).toBeDefined();
    });
  });
});
