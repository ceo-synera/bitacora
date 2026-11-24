"use client";

import { useEffect, useState } from "react";
import { onToast } from "@/lib/toast";

type Msg = { id: number; text: string; kind: "info" | "error" };

export function Toaster() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  useEffect(() => {
    const off = onToast((m) => {
      setMsgs((ms) => [...ms, m]);
      setTimeout(() => setMsgs((ms) => ms.filter((x) => x.id !== m.id)), 4000);
    });
    return () => void off();
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {msgs.map((m) => (
        <div
          key={m.id}
          role="status"
          className={`pointer-events-auto rounded-lg px-4 py-2 text-sm shadow-lg ${
            m.kind === "error" ? "bg-danger text-white" : "bg-ink text-bg"
          }`}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}
