import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import LiveDemo from "./components/LiveDemo";
import Architecture from "./components/Architecture";
import About from "./components/About";
import "./App.css";

export default function App() {
  return (
    <div className="bg-[#0d0d0d] min-h-screen text-[#e8eaf0] overflow-x-hidden w-full">
      <Navbar />

      {/* 1. Added 'flex flex-col' to make sections stack
        2. Added 'gap-20 lg:gap-[15vh] min-[1920px]:gap-[20vh]' 
           This creates a massive, consistent chasm between every section 
           that scales with your 4K monitor height.
      */}
      <main className="flex flex-col gap-20 lg:gap-[15vh] min-[1920px]:gap-[20vh]">
        <section id="hero">
          <Hero />
        </section>

        <section id="demo">
          <LiveDemo />
        </section>

        <section id="architecture">
          <Architecture />
        </section>

        <section id="about">
          <About />
        </section>
      </main>

      {/* Optional: Add a footer spacer so the 'About' section 
        doesn't hug the bottom of the browser.
      */}
      <div className="h-20 lg:h-[10vh]" />
    </div>
  );
}
