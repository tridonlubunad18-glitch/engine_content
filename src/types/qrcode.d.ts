// Déclaration minimale pour le module qrcode (génération d'images QR).
declare module "qrcode" {
  export function toFile(
    filePath: string,
    text: string,
    options?: { width?: number; margin?: number; scale?: number },
  ): Promise<void>;
  const _default: { toFile: typeof toFile };
  export default _default;
}
