import "../styles/globals.css";
import type { AppProps } from "next/app";
import { clusterApiUrl } from "@solana/web3.js";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { Adapter } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// Only works on this domain.
const ENDPOINT =
  "https://rpc.helius.xyz/?api-key=373379f8-865e-4d9c-bb9e-d1b40ea2e834";
const CONFIG = { commitment: "confirmed" } as const;
const WALLETS: Adapter[] = [];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConnectionProvider endpoint={ENDPOINT} config={CONFIG}>
      <WalletProvider wallets={WALLETS}>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
