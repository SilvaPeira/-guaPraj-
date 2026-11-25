/** Redimensiona a imagem no próprio celular antes de enviar. */
export async function prepararImagem(arquivo: File, maxLado: number, tipo: "image/png" | "image/jpeg"): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("imagem"));
      i.src = url;
    });
    const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * escala));
    const h = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    if (tipo === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(tipo, 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Foto de produto: recorta o centro em quadrado e reduz (fica igual em todos os cartões). */
export async function prepararFotoQuadrada(arquivo: File, lado = 600): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("imagem"));
      i.src = url;
    });
    const corte = Math.min(img.width, img.height);
    const final = Math.min(lado, corte);
    const canvas = document.createElement("canvas");
    canvas.width = final;
    canvas.height = final;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, final, final);
    ctx.drawImage(img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, final, final);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
