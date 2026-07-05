import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import DashboardPage from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import StudyPage from "./pages/Study";

function App() {
  return (
    <div className="bg-background min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/study/:deckId" element={<StudyPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
