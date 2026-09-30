"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Close menu when route changes
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
  }, [isOpen]);

  return (
    <>
      <button 
        className="mobileMenuToggleBtn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        <span className="mobileMenuIcon">{isOpen ? "✕" : "☰"}</span>
        <span className="mobileMenuBrand">CodePilot</span>
      </button>
      {isOpen && (
        <div className="mobileMenuOverlay" onClick={() => setIsOpen(false)}></div>
      )}
    </>
  );
}
