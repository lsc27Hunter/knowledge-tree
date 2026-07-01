import React from "react";

import { Navbar } from "../components/ui/Navbar";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

import GoogleIcon from "../assets/google-icon.svg";

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Navbar version="Blank" />

      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
        <h1 className="font-inter text-white text-title-large">Sign in</h1>
        <Button
          text="Continue with Google"
          color="white"
          textColor="accent"
          to="/not-found"
          icon={GoogleIcon}
          iconPosition="left"
        />
        <h2 className="font-inter text-primary-light-grey text-regular">OR</h2>
        <Input
          placeholderText="Email"
          width="full"
          color="background"
          textColor="white"
        />
        <Input
          placeholderText="Password"
          width="full"
          color="background"
          textColor="white"
        />

        <Button text="Login" color="accent" textColor="white" to="/dashboard" />
        <div className="flex items-center">
          <span className="text-primary-light-grey">
            Don't have an account?
          </span>

          <Button
            text="Register"
            color="background"
            textColor="accent"
            to="/register"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
