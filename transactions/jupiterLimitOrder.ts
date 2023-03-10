import { LimitOrderProvider } from "@jup-ag/limit-order-sdk";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import BN from "bn.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  hasGetEphemeralSignersFeature,
  FuseGetEphemeralSignersFeatureIdentifier,
} from "@sqds/fuse-wallet";

export async function createJupiterLimitOrder(
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

  const baseEphemeralAddress =
    "standard" in walletAdapter &&
    hasGetEphemeralSignersFeature(walletAdapter.wallet) &&
    (
      await walletAdapter.wallet.features[
        FuseGetEphemeralSignersFeatureIdentifier
      ].getEphemeralSigners(1)
    )[0];

  const baseEphemeralPubkey = baseEphemeralAddress
    ? new PublicKey(baseEphemeralAddress)
    : null;
  console.log("Ephemeral Base Address", baseEphemeralAddress);

  const baseKeypair = Keypair.generate();

  const basePubkey = baseEphemeralPubkey ?? baseKeypair.publicKey;

  console.log("Base:", basePubkey.toBase58());

  const limitOrder = new LimitOrderProvider(connection);

  const { tx, orderPubKey } = await limitOrder.createOrder({
    owner: walletPubkey,
    inAmount: new BN(0.001 * LAMPORTS_PER_SOL),
    outAmount: new BN(0.03 * 1_000_000), // 1_000_000 => 1 USDC if inputToken.address is USDC mint
    inputMint: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL
    outputMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
    expiredAt: null, // new BN(new Date().valueOf() / 1000),
    base: basePubkey,
  });

  tx.feePayer = walletPubkey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  console.log("Creating new Limit Order on Jupiter:", orderPubKey.toBase58());

  const signedTx = await walletContext.signTransaction(tx);
  if (!baseEphemeralPubkey) {
    signedTx.partialSign(baseKeypair);
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
