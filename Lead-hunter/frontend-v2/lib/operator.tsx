"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { OperatorId } from "./types";

interface OperatorCtx {
  operatorId: OperatorId;
  setOperatorId: (id: OperatorId) => void;
}

const Ctx = createContext<OperatorCtx>({ operatorId: "samuel", setOperatorId: () => {} });

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const [operatorId, setOperatorId] = useState<OperatorId>("samuel");

  useEffect(() => {
    const saved = window.localStorage.getItem("lh.operator");
    if (saved === "samuel" || saved === "jose") setOperatorId(saved);
  }, []);

  const set = (id: OperatorId) => {
    setOperatorId(id);
    window.localStorage.setItem("lh.operator", id);
  };

  return <Ctx.Provider value={{ operatorId, setOperatorId: set }}>{children}</Ctx.Provider>;
}

export function useOperator() {
  return useContext(Ctx);
}
