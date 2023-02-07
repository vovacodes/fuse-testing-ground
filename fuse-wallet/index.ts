import { WalletAccount, WalletWithFeatures } from "@wallet-standard/base";
import { Wallet, WalletContextState } from "@solana/wallet-adapter-react";
import {
  StandardWalletAdapter,
  WalletAdapterCompatibleWallet,
} from "@solana/wallet-standard-wallet-adapter-base";
import { Adapter } from "@solana/wallet-adapter-base";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { SolanaSignTransactionFeature } from "@solana/wallet-standard-features";

function isStandardWalletAdapter(
  adapter: Adapter
): adapter is StandardWalletAdapter {
  return "standard" in adapter && adapter.standard === true;
}

const FuseGetEphemeralWalletAccountsFeatureIdentifier =
  "fuse:getEphemeralWalletAccounts" as const;

type FuseGetEphemeralWalletAccountsFeature = {
  [FuseGetEphemeralWalletAccountsFeatureIdentifier]: {
    version: "1.0.0";
    getEphemeralWalletAccounts: (num: number) => Promise<WalletAccount[]>;
  };
};

type FuseStandardWallet = WalletWithFeatures<
  WalletAdapterCompatibleWallet["features"] &
    FuseGetEphemeralWalletAccountsFeature &
    SolanaSignTransactionFeature
>;

function isFuseStandardWallet(
  wallet: WalletAdapterCompatibleWallet
): wallet is FuseStandardWallet {
  return (
    FuseGetEphemeralWalletAccountsFeatureIdentifier in wallet.features &&
    "solana:signTransaction" in wallet.features
  );
}

type SignTransactionOptions = {
  ephemeralSigners: WalletAccount[];
};

type FuseWallet = {
  getEphemeralWalletAccounts: (num: number) => Promise<WalletAccount[]>;
  signTransaction: <T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: SignTransactionOptions
  ) => Promise<T>;
};

export function getFuseWallet(
  walletContext: WalletContextState
): FuseWallet | null {
  if (!walletContext.wallet || !walletContext.publicKey) return null;
  const walletAddress = walletContext.publicKey.toBase58();

  const { adapter } = walletContext.wallet;
  if (!isStandardWalletAdapter(adapter)) return null;

  const standardWallet = adapter.wallet;
  if (!isFuseStandardWallet(standardWallet)) {
    return null;
  }

  const fuseWallet: FuseWallet = {
    getEphemeralWalletAccounts(num) {
      return standardWallet.features[
        FuseGetEphemeralWalletAccountsFeatureIdentifier
      ].getEphemeralWalletAccounts(num);
    },

    async signTransaction<T extends Transaction | VersionedTransaction>(
      transaction: T,
      options?: SignTransactionOptions
    ) {
      const account = adapter.wallet.accounts.find(
        (acc) => acc.address === walletAddress
      );
      if (!account) throw new Error("account is not found");
      if (!account.features.includes("solana:signTransaction")) {
        throw new Error(
          `account ${account.address} doesn\'t support "solana:signTransaction" feature`
        );
      }

      const ephemeralSigners = options?.ephemeralSigners ?? [];
      ephemeralSigners.forEach((account) => {
        if (!account.features.includes("solana:signTransaction")) {
          throw new Error(
            `ephemeral account ${account.address} doesn\'t support "solana:signTransaction" feature`
          );
        }
      });

      const isVersionedTx = isVersionedTransaction(transaction);

      const serializedTransaction = isVersionedTx
        ? transaction.serialize()
        : new Uint8Array(
            transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            })
          );

      const signedTransactionBytes = (
        await standardWallet.features["solana:signTransaction"].signTransaction(
          {
            account,
            transaction: serializedTransaction,
          },
          ...ephemeralSigners.map((ephemeralAccount) => ({
            account: ephemeralAccount,
            transaction: serializedTransaction,
          }))
        )
      ).at(0)!.signedTransaction;

      const signedTransaction = (
        isVersionedTx
          ? VersionedTransaction.deserialize(signedTransactionBytes)
          : Transaction.from(signedTransactionBytes)
      ) as T;

      return signedTransaction;
    },
  };

  return fuseWallet;
}

function isVersionedTransaction(
  transaction: Transaction | VersionedTransaction
): transaction is VersionedTransaction {
  return "version" in transaction;
}
