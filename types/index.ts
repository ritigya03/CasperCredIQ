export interface Credential {
  role: string;
  issued_at: number;
  expires_at: number;
  revoked: boolean;
}

export interface WalletState {
  address: string | null;
  publicKey: string | null;
  isConnected: boolean;
}

export interface Role {
  value: string;
  label: string;
  resources: string[];
}