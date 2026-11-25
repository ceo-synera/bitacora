"use client";

import { useSyncExternalStore } from "react";
import { isReadOnly, subscribeRole } from "./role";

export function useReadOnly(): boolean {
  return useSyncExternalStore(subscribeRole, isReadOnly, () => false);
}
