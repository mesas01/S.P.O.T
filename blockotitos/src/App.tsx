import { Button, Layout } from "@stellar/design-system";
import "./App.module.css";
import ConnectAccount from "./components/ConnectAccount.tsx";
import MobileMenu from "./components/MobileMenu.tsx";
import { Routes, Route, Outlet, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Mint from "./pages/Mint";
import CreateEvent from "./pages/CreateEvent";
import Profile from "./pages/Profile";
import MyEvents from "./pages/MyEvents";

const AppLayout: React.FC = () => (
  <main className="min-h-screen flex flex-col bg-stellar-white">
    <div className="bg-stellar-white/95 backdrop-blur-sm shadow-md border-b-2 border-stellar-lilac/20 relative z-30">
      <Layout.Header
        projectId="SPOT"
        projectTitle="SPOT"
        contentRight={
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-nowrap justify-end w-full lg:w-auto">
          {/* Desktop Navigation - Show from md breakpoint (768px) */}
          <nav className="hidden md:flex items-center gap-3 flex-shrink-0">
            <NavLink to="/" className="no-underline">
              {({ isActive }) => (
                <Button
                  variant="tertiary"
                  size="md"
                  className={`rounded-full px-5 py-2 font-medium transition-all ${isActive ? "bg-stellar-black/5 text-stellar-black font-semibold" : "text-stellar-black/70 hover:text-stellar-black hover:bg-stellar-black/5"}`}
                >
                  Mis SPOTs
                </Button>
              )}
            </NavLink>
            <NavLink to="/my-events" className="no-underline">
              {({ isActive }) => (
                <Button
                  variant="tertiary"
                  size="md"
                  className={`rounded-full px-5 py-2 font-medium transition-all ${isActive ? "bg-stellar-black/5 text-stellar-black font-semibold" : "text-stellar-black/70 hover:text-stellar-black hover:bg-stellar-black/5"}`}
                >
                  Mis Eventos
                </Button>
              )}
            </NavLink>
            <NavLink to="/create-event" className="no-underline">
              {({ isActive }) => (
                <Button
                  variant="secondary"
                  size="md"
                  className={`bg-stellar-lilac text-stellar-black hover:bg-stellar-lilac/80 rounded-full px-5 py-2 font-semibold shadow-sm hover:shadow-md transition-all ${isActive ? "opacity-75" : ""}`}
                >
                  Crear Evento
                </Button>
              )}
            </NavLink>
            <NavLink to="/mint" className="no-underline">
              {({ isActive }) => (
                <Button
                  variant="primary"
                  size="md"
                  className={`bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-5 py-2 shadow-sm hover:shadow-md transition-all ${isActive ? "opacity-75" : ""}`}
                >
                  ⚡ Reclamar
                </Button>
              )}
            </NavLink>
          </nav>
          
          {/* Mobile/Tablet buttons - Show until md */}
          <div className="md:hidden flex items-center gap-2">
            <NavLink to="/mint" className="no-underline">
              {({ isActive }) => (
                <Button
                  variant="primary"
                  size="md"
                  className={`bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all ${isActive ? "opacity-75" : ""}`}
                >
                  ⚡
                </Button>
              )}
            </NavLink>
          </div>
          
          {/* Profile Link - Always visible */}
          <div className="flex-shrink-0">
            <NavLink to="/profile" className="no-underline">
              {({ isActive }) => (
                <Button
                  variant="tertiary"
                  size="md"
                  className={`rounded-full px-4 py-2 transition-all ${isActive ? "bg-stellar-black/5 text-stellar-black" : "text-stellar-black/70 hover:text-stellar-black hover:bg-stellar-black/5"}`}
                >
                  <span className="hidden sm:inline">👤 Perfil</span>
                  <span className="sm:hidden">👤</span>
                </Button>
              )}
            </NavLink>
          </div>
          {/* Desktop Wallet - Show from lg breakpoint (1024px) */}
          <div className="hidden lg:block flex-shrink-0">
            <ConnectAccount />
          </div>
          {/* Mobile Menu - Hide from lg breakpoint */}
          <div className="md:hidden flex-shrink-0">
            <MobileMenu />
          </div>
        </div>
      }
      />
    </div>
    <div className="flex-1">
      <Outlet />
    </div>
    <div className="bg-stellar-white/95 backdrop-blur-sm border-t-2 border-stellar-lilac/20 mt-auto py-4">
      <Layout.Footer>
        <span className="text-gray-600">
          © {new Date().getFullYear()} SPOT. Stellar Proof of Togetherness.
        </span>
      </Layout.Footer>
    </div>
  </main>
);

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/mint" element={<Mint />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
