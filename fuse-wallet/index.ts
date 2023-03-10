import { Wallet, WalletWithFeatures } from "@wallet-standard/base";
import { StandardWalletAdapter } from "@solana/wallet-standard-wallet-adapter-base";
import { Adapter } from "@solana/wallet-adapter-base";

export function isStandardWalletAdapter(
  adapter: Adapter
): adapter is StandardWalletAdapter {
  return (adapter as any).standard === true;
}

const FuseGetEphemeralSignersFeatureIdentifier =
  "fuse:getEphemeralSigners" as const;

type FuseGetEphemeralSignersFeature = {
  [FuseGetEphemeralSignersFeatureIdentifier]: {
    version: "1.0.0";
    getEphemeralSigners: (num: number) => Promise<string[]>;
  };
};

export function hasGetEphemeralSignersFeature(
  wallet: Wallet
): wallet is WalletWithFeatures<
  (typeof wallet)["features"] & FuseGetEphemeralSignersFeature
> {
  return FuseGetEphemeralSignersFeatureIdentifier in wallet.features;
}
