"use client";

type Listener = (msg: { id: number; text: string; kind: "info" | "error" }) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function toast(text: string, kind: "info" | "error" = "info") {
  const msg = { id: ++seq, text, kind };
  listeners.forEach((l) => l(msg));
}

export function onToast(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
