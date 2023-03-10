import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  createInitializeMintInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  hasGetEphemeralSignersFeature,
  FuseGetEphemeralSignersFeatureIdentifier,
} from "@sqds/fuse-wallet";

export async function initializeMint(
  connection: Connection,
  walletContext: WalletContextState
) {
  if (
    !walletContext.connected ||
    !walletContext.wallet ||
    !walletContext.signTransaction
  )
    throw new Error("Not connected");

  const walletPubkey = walletContext.wallet.adapter.publicKey!;
  const walletAdapter = walletContext.wallet.adapter;

  const lamportsForMintRent = await getMinimumBalanceForRentExemptMint(
    connection
  );

  let mintEphemeralAddress = null;
  if (
    "standard" in walletAdapter &&
    hasGetEphemeralSignersFeature(walletAdapter.wallet)
  ) {
    [mintEphemeralAddress] = await walletAdapter.wallet.features[
      FuseGetEphemeralSignersFeatureIdentifier
    ].getEphemeralSigners(1);
  }
  console.log("mintEphemeralAddress:5", mintEphemeralAddress);

  const mintKeypair = Keypair.generate();

  const mintPubkey = mintEphemeralAddress
    ? new PublicKey(mintEphemeralAddress)
    : mintKeypair.publicKey;

  const message = new TransactionMessage({
    payerKey: walletPubkey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mintPubkey,
        space: MINT_SIZE,
        lamports: lamportsForMintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintPubkey,
        9,
        walletPubkey,
        walletPubkey
      ),
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);

  console.log("Creating and initializing new mint:", mintPubkey.toBase58());

  const signedTx = await walletContext.signTransaction(tx);
  if (!mintEphemeralAddress) {
    signedTx.partialSign(mintKeypair);
  }

  const proceed = prompt("Send the transaction? y/n");
  if (proceed !== "y") {
    console.log("cancelled");
    return;
  }

  console.log("Sending transaction...");
  const sig = await connection.sendRawTransaction(signedTx.serialize());

  console.log("Confirming transaction", sig);
  await connection.confirmTransaction(sig);
  console.log("✅ Done");
}
