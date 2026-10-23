import { useState, useRef, useEffect } from "react";
import { LogOut, Leaf } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

/**
 * Top-right user chip + sign-out. Mounted by pages that render authenticated
 * chrome (Workspace in Module 04, validation page in Module 12).
 */
export function UserMenu({ top = true }: { top?: boolean }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const emailRef = useRef(user?.email);
  useEffect(() => { emailRef.current = user?.email; }, [user?.email]);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
    } catch {
      toast.error("Sign-out failed");
    }
  };

  return (
    <div className={top ? "absolute top-4 right-4 z-20" : "relative z-20"}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Leaf className="w-3 h-3" />
            </span>
            <span className="text-foreground max-w-[160px] truncate">{user.email}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={handleSignOut} className="text-xs cursor-pointer">
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default UserMenu;
