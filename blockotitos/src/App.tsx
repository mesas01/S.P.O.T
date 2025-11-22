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
  <main className="min-h-screen flex flex-col bg-stellar-white relative overflow-hidden">
    {/* Background decorative elements - Global */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-stellar-lilac/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-stellar-gold/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-stellar-teal/5 rounded-full blur-3xl" />
    </div>

    {/* Header - Navbar ultra compacta y minimalista */}
    <div className="relative z-30 bg-stellar-white/98 backdrop-blur-md shadow-sm border-b border-stellar-lilac/10">
      {/* Decorative line at top - más delgada */}
      <div className="h-px bg-gradient-to-r from-stellar-gold via-stellar-lilac to-stellar-teal opacity-60" />
      
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <img 
              src="src\images\image.png"
              alt="Soto"
              className="w-6 h-6 object-contain"
            />
            <span className="text-lg font-bold text-stellar-black uppercase">SPOT</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-6">
            {/* Desktop Navigation - Solo texto con animaciones */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLink to="/" className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-semibold transition-colors duration-200 ${
                    isActive ? "text-stellar-black" : "text-stellar-black/60 hover:text-stellar-black"
                  }`}>
                    Mis SPOTs
                    {/* Underline animation */}
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-gold transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </span>
                )}
              </NavLink>
              
              <NavLink to="/my-events" className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-semibold transition-colors duration-200 ${
                    isActive ? "text-stellar-black" : "text-stellar-black/60 hover:text-stellar-black"
                  }`}>
                    Mis Eventos
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-lilac transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </span>
                )}
              </NavLink>
              
              <NavLink to="/create-event" className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-bold transition-all duration-200 ${
                    isActive 
                      ? "text-stellar-lilac scale-105" 
                      : "text-stellar-black/70 hover:text-stellar-lilac hover:scale-105"
                  }`}>
                    ➕ Crear Evento
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-lilac transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </span>
                )}
              </NavLink>
              
              <NavLink to="/mint" className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-bold transition-all duration-200 ${
                    isActive 
                      ? "text-stellar-gold scale-110" 
                      : "text-stellar-black/70 hover:text-stellar-gold hover:scale-110"
                  }`}>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-base">⚡</span> 
                      <span>Reclamar</span>
                    </span>
                    {/* Glow effect on hover */}
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-gold transition-all duration-300 ${
                      isActive ? "w-full shadow-[0_0_8px_rgba(255,200,69,0.8)]" : "w-0 group-hover:w-full group-hover:shadow-[0_0_8px_rgba(255,200,69,0.8)]"
                    }`} />
                  </span>
                )}
              </NavLink>
            </nav>
            
            {/* Mobile Reclamar button */}
            <div className="md:hidden">
              <NavLink to="/mint" className="no-underline">
                {({ isActive }) => (
                  <span className={`text-xl transition-all duration-200 ${
                    isActive 
                      ? "opacity-100 scale-125 drop-shadow-[0_0_8px_rgba(255,200,69,0.8)]" 
                      : "opacity-70 hover:opacity-100 hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(255,200,69,0.8)]"
                  }`}>
                    ⚡
                  </span>
                )}
              </NavLink>
            </div>
            
            {/* Profile Link */}
            <div className="hidden sm:block">
              <NavLink to="/profile" className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-medium transition-colors duration-200 flex items-center gap-1 ${
                    isActive ? "text-stellar-black" : "text-stellar-black/60 hover:text-stellar-black"
                  }`}>
                    <span>👤</span>
                    <span className="hidden lg:inline">Perfil</span>
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-teal transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </span>
                )}
              </NavLink>
            </div>
            
            {/* Desktop Wallet */}
            <div className="hidden lg:block">
              <ConnectAccount />
            </div>
            
            {/* Mobile Menu */}
            <div className="md:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 relative z-10">
      <Outlet />
    </div>

    {/* Footer - Compacto */}
    <div className="relative z-30 bg-stellar-white/98 backdrop-blur-md border-t border-stellar-lilac/10 mt-auto">
      {/* Decorative line at bottom */}
      <div className="h-px bg-gradient-to-r from-stellar-teal via-stellar-lilac to-stellar-gold opacity-60" />
      
      <div className="py-3 text-center">
        <div className="flex justify-center items-center gap-2 mb-1">
          <img 
            src="src\images\image.png"
            alt="Soto"
            className="w-5 h-5 object-contain"
          />
          <span className="text-stellar-black font-bold text-sm">SPOT</span>
        </div>
        <span className="text-stellar-black/50 text-xs">
          © {new Date().getFullYear()} SPOT · Stellar Proof of Togetherness
        </span>
        <div className="mt-1 flex justify-center gap-2 text-xs text-stellar-black/40">
          <span>Powered by Stellar</span>
          <span>•</span>
          <span>Built with ❤️</span>
        </div>
      </div>
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