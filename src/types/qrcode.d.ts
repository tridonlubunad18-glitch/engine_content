// Déclaration minimale pour le module qrcode (génération d'images / QR terminal).
declare module "qrcode" {
  export function toFile(
    filePath: string,
    text: string,
    options?: { width?: number; margin?: number; scale?: number },
  ): Promise<void>;
  export function toString(
    text: string,
    options?: { type?: "terminal"; small?: boolean },
  ): Promise<string>;
  const _default: { toFile: typeof toFile; toString: typeof toString };
  export default _default;
}

