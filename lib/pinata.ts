import PinataClient from "@pinata/sdk";

const pinata = new PinataClient({
  pinataApiKey: process.env.PINATA_API_KEY!,
  pinataSecretApiKey: process.env.PINATA_SECRET_KEY!,
});

export default pinata;

export async function uploadHtmlToPinata(html: string, subdomain: string): Promise<string> {
  const { Readable } = await import("stream");
  const stream = Readable.from([html]);
  // @ts-ignore
  stream.path = `${subdomain}-petid.html`;
  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: {
      name: `${subdomain}-petid-page`,
      keyvalues: { subdomain, type: "pet-page" },
    },
    pinataOptions: { cidVersion: 0 },
  });
  return result.IpfsHash;
}

export async function uploadPhotoToPinata(imageBuffer: Buffer, filename: string): Promise<string> {
  const { Readable } = await import("stream");
  const stream = Readable.from([imageBuffer]);
  // @ts-ignore
  stream.path = filename;
  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: { name: `petid-photo-${filename}` },
    pinataOptions: { cidVersion: 0 },
  });
  return result.IpfsHash;
}

export const IPFS_GATEWAYS = {
  primary: (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`,
  cloudflare: (cid: string) => `https://cloudflare-ipfs.com/ipfs/${cid}`,
  public: (cid: string) => `https://ipfs.io/ipfs/${cid}`,
  ensLimo: (subdomain: string, parent: string) => `https://${subdomain}.${parent}.limo`,
};
