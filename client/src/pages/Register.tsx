import React from "react";

import { Navbar } from "../components/ui/Navbar";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

import Email from "../assets/email.svg";
import Person from "../assets/PersonIcon.svg";
import Password from "../assets/password.svg";

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Navbar version="Blank" />

      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
        <div className="w-full max-w-md flex flex-col gap-4">
          {" "}
          <Input
            placeholderText="Email"
            width="full"
            color="background"
            textColor="white"
            icon={Email}
            iconPosition="left"
          />
          <Input
            placeholderText="Username"
            width="full"
            color="background"
            textColor="white"
            icon={Person}
            iconPosition="left"
          />
          <Input
            placeholderText="Password"
            width="full"
            color="background"
            textColor="white"
            icon={Password}
            iconPosition="left"
          />
        </div>
        <Button
          text="Register"
          color="accent"
          textColor="white"
          width="fit"
          to="/dashboard"
        />
      </div>
    </div>
  );
};

export default RegisterPage;
