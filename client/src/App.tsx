import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import DashboardPage from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";

function App() {
  return (
    <div className="bg-background min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}

export default App;
