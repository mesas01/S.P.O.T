import { useState, useEffect } from "react";
import "./App.module.css";
import ConnectAccount from "./components/ConnectAccount.tsx";
import MobileMenu from "./components/MobileMenu.tsx";
import { Routes, Route, Outlet, NavLink, Link } from "react-router-dom";
import { Plus, Zap, User } from "lucide-react";
import spotLogo from "./images/Recurso_1.svg";
import Home from "./pages/Home";
import Mint from "./pages/Mint";
import CreateEvent from "./pages/CreateEvent";
import Profile from "./pages/Profile";
import MyEvents from "./pages/MyEvents";

const AppLayout: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-stellar-white relative">
      {/* Global background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-stellar-lilac/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-stellar-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-stellar-teal/5 rounded-full blur-3xl" />
      </div>

      {/* ── Header ──────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-stellar-white/90 backdrop-blur-xl border-b border-stellar-lilac/15 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 no-underline">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stellar-gold">
              <img 
              src={spotLogo}
              alt="Soto"
              className="w-6 h-6 object-contain"
            />
              </div>
              <span className="text-lg font-headline text-stellar-black tracking-tight">SPOT</span>
            </NavLink>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <NavLink to="/" end className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-semibold font-body transition-colors duration-200 ${
                    isActive ? "text-stellar-black" : "text-stellar-black/60 hover:text-stellar-black"
                  }`}>
                    Mis SPOTs
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-gold transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </span>
                )}
              </NavLink>

              <NavLink to="/my-events" className="no-underline group">
                {({ isActive }) => (
                  <span className={`relative text-sm font-semibold font-body transition-colors duration-200 ${
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
                  <span className={`relative inline-flex items-center gap-1 text-sm font-semibold font-body transition-colors duration-200 ${
                    isActive ? "text-stellar-lilac" : "text-stellar-black/60 hover:text-stellar-lilac"
                  }`}>
                    <Plus size={14} />
                    Crear Evento
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-stellar-lilac transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </span>
                )}
              </NavLink>

              <NavLink to="/mint" className="no-underline">
                {({ isActive }) => (
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold font-body rounded-full px-4 py-1.5 transition-all duration-200 ${
                    isActive
                      ? "bg-stellar-gold text-stellar-black shadow-md"
                      : "border border-stellar-gold/50 text-stellar-black hover:bg-stellar-gold/10"
                  }`}>
                    <Zap size={14} />
                    Reclamar
                  </span>
                )}
              </NavLink>
            </nav>

            {/* Right: profile + wallet + mobile menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <NavLink to="/profile" className="no-underline">
                  {({ isActive }) => (
                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                      isActive
                        ? "bg-stellar-lilac/20 text-stellar-black"
                        : "text-stellar-black/50 hover:text-stellar-black hover:bg-stellar-black/5"
                    }`}>
                      <User size={17} />
                    </span>
                  )}
                </NavLink>
              </div>

              <div className="hidden lg:block">
                <ConnectAccount />
              </div>

              <div className="md:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 relative z-10">
        <Outlet />
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="relative z-30 bg-stellar-white/95 backdrop-blur-md border-t border-stellar-lilac/15 mt-auto">
        <div className="h-px bg-gradient-to-r from-stellar-teal via-stellar-lilac to-stellar-gold opacity-50" />

        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4 no-underline">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stellar-gold">
                <img 
              src={spotLogo}
              alt="Soto"
              className="w-6 h-6 object-contain"
            />
                </div>
                <span className="text-lg font-headline text-stellar-black tracking-tight">SPOT</span>
              </Link>
              <p className="text-sm text-stellar-black/60 leading-relaxed max-w-xs font-body">
                Stellar Proof of Togetherness. Comprobantes coleccionables
                verificables en la red Stellar.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h4 className="text-sm font-headline text-stellar-black uppercase tracking-wider mb-4">
                Producto
              </h4>
              <ul className="space-y-3">
                {[
                  { to: "/mint", label: "Reclamar SPOT" },
                  { to: "/create-event", label: "Crear Evento" },
                  { to: "/my-events", label: "Mis Eventos" },
                  { to: "/profile", label: "Perfil" },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm text-stellar-black/60 hover:text-stellar-black transition-colors no-underline font-body"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ecosistema */}
            <div>
              <h4 className="text-sm font-headline text-stellar-black uppercase tracking-wider mb-4">
                Ecosistema
              </h4>
              <ul className="space-y-3">
                {[
                  { href: "https://stellar.org", label: "Stellar Network" },
                  { href: "https://soroban.stellar.org", label: "Soroban" },
                  { href: "https://github.com/stellar", label: "Stellar SDK" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-stellar-black/60 hover:text-stellar-black transition-colors no-underline font-body"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="text-sm font-headline text-stellar-black uppercase tracking-wider mb-4">
                Recursos
              </h4>
              <ul className="space-y-3">
                {[
                  { to: "/", label: "Documentación" },
                  { to: "/", label: "API" },
                ].map(({ to, label }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-stellar-black/60 hover:text-stellar-black transition-colors no-underline font-body"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-stellar-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stellar-black/50 font-body">
              Built on Stellar Network · Testnet
            </p>
            <p className="text-xs text-stellar-black/50 font-body">
              © {new Date().getFullYear()} SPOT · Stellar Proof of Togetherness
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

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
