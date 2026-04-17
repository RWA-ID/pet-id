import { CID } from "multiformats/cid";

export function cidToContenthash(cidString: string): string {
  const cid = CID.parse(cidString);
  const cidV1 = cid.toV1();
  const bytes = new Uint8Array([0xe3, 0x01, ...cidV1.bytes]);
  return "0x" + Buffer.from(bytes).toString("hex");
}
