import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

const NotFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
        <button onClick={() => navigate(user ? "/" : "/login")} className="text-primary underline hover:text-primary/90">
          Return {user ? "to workspace" : "to sign in"}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
