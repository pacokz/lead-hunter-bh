"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./toast";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("success", "Copiado pra área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("error", "Não foi possível copiar");
    }
  }

  return (
    <Button size="sm" onClick={copy} aria-label={label}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-ok" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? "Copiado" : label}
    </Button>
  );
}
