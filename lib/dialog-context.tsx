"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DialogContextType = {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"alert" | "confirm">("alert");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [resolveFn, setResolveFn] = useState<(value: any) => void>(() => {});

  const alert = (msg: string, t?: string) => {
    return new Promise<void>((resolve) => {
      setType("alert");
      setMessage(msg);
      setTitle(t || "Alert");
      setResolveFn(() => resolve);
      setIsOpen(true);
    });
  };

  const confirm = (msg: string, t?: string) => {
    return new Promise<boolean>((resolve) => {
      setType("confirm");
      setMessage(msg);
      setTitle(t || "Confirm");
      setResolveFn(() => resolve);
      setIsOpen(true);
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    if (type === "confirm") {
      resolveFn(false);
    } else {
      resolveFn(undefined);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolveFn(true);
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <DialogFooter>
            {type === "confirm" ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm}>
                  Confirm
                </Button>
              </>
            ) : (
              <Button onClick={handleClose}>
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}
