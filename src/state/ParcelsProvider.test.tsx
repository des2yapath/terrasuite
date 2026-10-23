import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { ParcelsProvider, useParcels } from "@/state/ParcelsProvider";
import { useAuth } from "@/auth/useAuth";
import type { Parcel } from "@/data/parcel";

/* Mocks ---------------------------------------------------------------- */

vi.mock("@/auth/useAuth", () => ({ useAuth: vi.fn() }));
const mockListParcels = vi.fn();
const mockCreateParcel = vi.fn();
const mockUpdateParcel = vi.fn();
const mockDeleteParcel = vi.fn();
vi.mock("@/services/parcels-service", () => ({
  listParcels: (...a: unknown[]) => mockListParcels(...(a as [])),
  createParcel: (...a: unknown[]) => mockCreateParcel(...(a as [Parcel])),
  updateParcel: (...a: unknown[]) => mockUpdateParcel(...(a as [Parcel])),
  deleteParcel: (...a: unknown[]) => mockDeleteParcel(...(a as [string])),
}));
const { listParcels: _l } = await import("@/services/parcels-service"); void _l;

const p1: Parcel = {
  id: "c-1", name: "Alpha", area: 2, crop: "Wheat", location: "X",
  color: "#E5C07B", coordinates: [[[0,0],[0,1],[1,1],[1,0],[0,0]]],
};
const p2: Parcel = {
  id: "c-2", name: "Beta", area: 3, crop: "Rice", location: "Y",
  color: "#61AFEF", coordinates: [[[0,0],[0,1],[1,1],[1,0],[0,0]]],
};

function Probe() {
  const { parcels, loading, addParcel, removeParcel, selectedIds } = useParcels();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="count">{parcels.length}</div>
      <div data-testid="sel">{selectedIds.join(",")}</div>
      <button data-testid="add" onClick={() => { void addParcel(p2).catch(() => undefined); }}>add</button>
      <button data-testid="del" onClick={() => { void removeParcel("c-1").catch(() => undefined); }}>del</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: "u1", email: "a@b.com" }, loading: false } as never);
  localStorage.clear();
});

describe("ParcelsProvider", () => {
  it("loads parcels from the server on login and selects all by default", async () => {
    mockListParcels.mockResolvedValue([p1, p2]);
    render(<ParcelsProvider><Probe /></ParcelsProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("2"));
    expect(screen.getByTestId("sel").textContent).toBe("c-1,c-2");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("optimistically adds a parcel and keeps it when server succeeds", async () => {
    mockListParcels.mockResolvedValue([p1]);
    mockCreateParcel.mockResolvedValue(undefined);
    render(<ParcelsProvider><Probe /></ParcelsProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
    await act(async () => { fireEvent.click(screen.getByTestId("add")); });
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("2"));
    expect(mockCreateParcel).toHaveBeenCalledWith(p2);
  });

  it("rolls back an add when the server rejects it", async () => {
    mockListParcels.mockResolvedValue([p1]);
    mockCreateParcel.mockRejectedValue(new Error("boom"));
    render(<ParcelsProvider><Probe /></ParcelsProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
    await act(async () => { fireEvent.click(screen.getByTestId("add")); });
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
  });

  it("optimistically removes a parcel and calls the delete service", async () => {
    mockListParcels.mockResolvedValue([p1, p2]);
    mockDeleteParcel.mockResolvedValue(undefined);
    render(<ParcelsProvider><Probe /></ParcelsProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("2"));
    await act(async () => { fireEvent.click(screen.getByTestId("del")); });
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
    expect(mockDeleteParcel).toHaveBeenCalledWith("c-1");
  });

  it("clears state on sign-out (no user)", async () => {
    mockListParcels.mockResolvedValue([p1]);
    const { rerender } = render(<ParcelsProvider><Probe /></ParcelsProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    rerender(<ParcelsProvider><Probe /></ParcelsProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("0"));
  });
});
