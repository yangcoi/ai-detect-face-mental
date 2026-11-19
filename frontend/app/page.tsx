"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) { router.push("/login"); return; }
    if (user.role === "admin") router.push("/admin");
    else router.push("/checkin");
  }, [router]);
  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#11111b" }}>
      <p style={{ color: "#6c7086" }}>Đang chuyển hướng...</p>
    </main>
  );
}
