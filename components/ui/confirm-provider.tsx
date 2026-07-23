"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  pendingRef.current = pending;

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    pendingRef.current?.resolve(value);
    setPending(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(pending)}
        onClose={() => close(false)}
        title={pending?.title ?? ""}
        description={pending?.description}
        size="sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {pending?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={pending?.variant === "destructive" ? "destructive" : "default"}
            onClick={() => close(true)}
          >
            {pending?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context.confirm;
}
