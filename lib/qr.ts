import QRCode from "qrcode";

export async function generateQRCode(
  subdomain: string,
  parentDomain: string
): Promise<Buffer> {
  const url = `https://${subdomain}.${parentDomain}.limo`;
  return QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
    color: {
      dark: "#2C1810",
      light: "#FAFAF8",
    },
    errorCorrectionLevel: "H",
  });
}
