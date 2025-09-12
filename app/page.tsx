"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import WaterRippleEffect from "@/components/WaterRippleEffect";

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        Oceanel
        <SignOutButton />
      </header>
      <WaterRippleEffect 
        className="absolute inset-0 w-full h-full"
        style={{ width: '100vw', height: '100vh' }}
      />
    </div>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-200 dark:bg-slate-800 text-foreground rounded-md px-2 py-1"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </button>
      )}
    </>
  );
}