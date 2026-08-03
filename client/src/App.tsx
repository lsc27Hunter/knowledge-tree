import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import DashboardPage from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import StudyPage from "./pages/Study";
import DiscoveryPage from "./pages/DiscoveryPage";
import FriendsPage from "./pages/FriendsPage";
import UserProfilePage from "./pages/UserProfilePage";

function App() {
  return (
    <div className="bg-background min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/study/:deckId" element={<StudyPage />} />
          <Route path="/discovery" element={<DiscoveryPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/users/:userId" element={<UserProfilePage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
