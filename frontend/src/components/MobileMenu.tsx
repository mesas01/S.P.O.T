import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import ConnectAccount from "./ConnectAccount";
import UserInfo from "./UserInfo";
import { createPortal } from "react-dom";
import { Zap, CalendarDays, Plus, User, Menu, X } from "lucide-react";

const MobileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navItems = [
    {
      to: "/mint",
      label: "Reclamar SPOT",
      Icon: Zap,
      activeColor: "bg-stellar-gold text-stellar-black shadow-md",
      hoverColor: "bg-stellar-warm-grey/30 hover:bg-stellar-gold/20 text-stellar-black",
    },
    {
      to: "/my-events",
      label: "Mis Eventos",
      Icon: CalendarDays,
      activeColor: "bg-stellar-lilac/20 text-stellar-black shadow-md",
      hoverColor: "bg-stellar-warm-grey/30 hover:bg-stellar-lilac/10 text-stellar-black",
    },
    {
      to: "/create-event",
      label: "Crear Evento",
      Icon: Plus,
      activeColor: "bg-stellar-lilac/20 text-stellar-black shadow-md",
      hoverColor: "bg-stellar-warm-grey/30 hover:bg-stellar-lilac/10 text-stellar-black",
    },
    {
      to: "/profile",
      label: "Mi Perfil",
      Icon: User,
      activeColor: "bg-stellar-lilac/20 text-stellar-black shadow-md",
      hoverColor: "bg-stellar-warm-grey/30 hover:bg-stellar-lilac/10 text-stellar-black",
    },
  ];

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-lg text-stellar-black/60 hover:text-stellar-black hover:bg-stellar-black/5 transition-colors"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        <Menu size={20} />
      </button>

      {isMounted &&
        createPortal(
          <>
            {/* Backdrop */}
            {isOpen && (
              <div
                className="fixed inset-0 bg-stellar-black/40 backdrop-blur-sm z-[90] lg:hidden"
                onClick={closeMenu}
              />
            )}

            {/* Drawer */}
            <div
              className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-stellar-white/98 backdrop-blur-md shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out lg:hidden ${
                isOpen ? "translate-x-0" : "translate-x-full"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Menú principal"
            >
              <div className="flex flex-col h-full">
                {/* Drawer header */}
                <div className="p-6 border-b border-stellar-lilac/15">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stellar-gold">
                        <span className="text-base font-headline text-stellar-black leading-none">S</span>
                      </div>
                      <span className="text-base font-headline text-stellar-black">SPOT</span>
                    </div>
                    <button
                      onClick={closeMenu}
                      className="p-2 rounded-lg text-stellar-black/50 hover:text-stellar-black hover:bg-stellar-black/5 transition-colors"
                      aria-label="Cerrar menú"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <UserInfo />
                </div>

                {/* Nav links */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                  {navItems.map(({ to, label, Icon, activeColor, hoverColor }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className="no-underline block"
                      onClick={closeMenu}
                    >
                      {({ isActive }) => (
                        <div
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-body font-semibold text-sm ${
                            isActive ? activeColor : hoverColor
                          }`}
                        >
                          <Icon size={16} />
                          {label}
                        </div>
                      )}
                    </NavLink>
                  ))}

                  {/* Wallet section */}
                  <div className="pt-6 mt-4 border-t border-stellar-lilac/15">
                    <p className="text-xs font-body uppercase tracking-widest text-stellar-black/50 mb-4">
                      Wallet
                    </p>
                    <ConnectAccount />
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export default MobileMenu;
