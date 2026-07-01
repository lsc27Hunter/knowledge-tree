import React from "react";

import { Navbar } from "../components/ui/Navbar";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Navbar version="Blank" />

      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
        <h1 className="font-inter text-white text-title-large">Register</h1>
        <Input
          placeholderText="Email"
          width="fit"
          color="background"
          textColor="white"
        />
        <Input
          placeholderText="Username"
          width="fit"
          color="background"
          textColor="white"
        />
        <Input
          placeholderText="Password"
          width="fit"
          color="background"
          textColor="white"
        />
        <Button
          text="Register"
          color="accent"
          textColor="white"
          to="/dashboard"
        />
      </div>
    </div>
  );
};

export default RegisterPage;
