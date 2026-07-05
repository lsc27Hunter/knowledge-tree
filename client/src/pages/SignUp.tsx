import { SignUp } from "@clerk/react";

import { Navbar } from "../components/ui/Navbar";

export default function SignUpPage() {
  return (
    <div className="min-h-screen">
      <Navbar version="Blank" />
      <div className="flex justify-center pt-12 px-4">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
