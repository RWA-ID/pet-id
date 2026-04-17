export interface PetFormData {
  subdomain: string;
  parentDomain: "dogid.eth" | "catid.eth";
  species: "dog" | "cat";
  name: string;
  breed?: string;
  ageYears?: number;
  color?: string;
  sex?: "male" | "female" | "unknown";
  bio?: string;
  emergencyNotes?: string;
  photoFile?: File;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail: string;
  templateId: string;
}

export interface Pet {
  id: string;
  subdomain: string;
  parentDomain: string;
  fullEns: string;
  species: "dog" | "cat";
  name: string;
  breed?: string;
  ageYears?: number;
  color?: string;
  sex?: string;
  bio?: string;
  emergencyNotes?: string;
  photoCid?: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail: string;
  templateId: string;
  pageCid?: string;
  contenthash?: string;
  txHash?: string;
  ipfsGatewayUrl?: string;
  helioPaymentId?: string;
  amountPaidCents?: number;
  paidAt?: string;
  isCryptoFlow: boolean;
  walletAddress?: string;
  status: "pending" | "paid" | "minting" | "live" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationState {
  step: 1 | 2 | 3 | 4;
  subdomain: string;
  parentDomain: "dogid.eth" | "catid.eth";
  petData: Partial<PetFormData>;
  templateId: string | null;
  ownerEmail: string;
  isAvailable: boolean | null;
  petId: string | null;
}
