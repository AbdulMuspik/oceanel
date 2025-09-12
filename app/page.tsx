"use client";

import WaterRippleEffect from "@/components/WaterRippleEffect";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Navbar />
      <WaterRippleEffect 
        className="absolute inset-0 w-full h-full"
        style={{ width: '100vw', height: '100vh' }}
      />
    </div>
  );
}