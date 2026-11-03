"use client";

import { useEffect } from "react";

type KeyboardShortcutOptions = {
  enabled?: boolean;
  preventDefault?: boolean;
};

export function useKeyboardShortcut(
  keys: { key: string; metaOrCtrl?: boolean; shift?: boolean },
  callback: () => void,
  options: KeyboardShortcutOptions = {}
) {
  const { enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const pressedKey = event.key;
      if (!pressedKey || typeof pressedKey !== "string") {
        return;
      }

      if (pressedKey.toLowerCase() !== keys.key.toLowerCase()) {
        return;
      }

      if (keys.metaOrCtrl && !(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (keys.shift && !event.shiftKey) {
        return;
      }

      if (!keys.shift && event.shiftKey) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      callback();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callback, enabled, keys.key, keys.metaOrCtrl, keys.shift, preventDefault]);
}
