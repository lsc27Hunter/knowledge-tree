import { useAuth } from "@clerk/react";
import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "./ui/Spinner";

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!isSignedIn) {
    // Send to landing (not /sign-in) so Clerk sign-out doesn't flash the sign-in page.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
