// Marca Balmor — logo principal oficial (aplicação em fundo escuro,
// conforme brand kit: alto contraste, glow roxo/lilás discreto).

import Image from "next/image";

export function BalmorLogo() {
  return (
    <Image
      src="/balmor-logo.png"
      alt="Balmor — Software House"
      width={168}
      height={50}
      priority
      className="drop-shadow-[0_0_10px_rgba(168,85,247,0.25)]"
    />
  );
}
