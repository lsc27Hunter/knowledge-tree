import { SignIn } from "@clerk/react";

import { Navbar } from "../components/ui/Navbar";

export default function SignInPage() {
  return (
    <div className="min-h-screen">
      <Navbar version="Blank" />
      <div className="flex justify-center pt-12 px-4">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
