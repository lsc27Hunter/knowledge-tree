import React from "react";

import { Navbar } from "../components/ui/Navbar";

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Navbar version="Blank" />

      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <h1 className="font-inter text-white text-title-large">Register</h1>
      </div>
    </div>
  );
};

export default RegisterPage;
