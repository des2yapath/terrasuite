import { Outlet } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { ParcelsProvider } from "@/state/ParcelsProvider";

/** Authenticated layout shared by workspace routes. */
const AppLayout = () => (
  <RequireAuth>
    <ParcelsProvider>
      <Outlet />
    </ParcelsProvider>
  </RequireAuth>
);

export default AppLayout;
