import { createMemoInstruction } from "@solana/spl-memo";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export async function sendMemo(
  connection: Connection,
  walletContext: WalletContextState
) {
  if (
    !walletContext.connected ||
    !walletContext.wallet ||
    !walletContext.signTransaction
  ) {
    throw new Error("Not connected");
  }

  const walletPubkey = walletContext.wallet.adapter.publicKey!;
  const walletAdapter = walletContext.wallet.adapter;

  const message = new TransactionMessage({
    payerKey: walletPubkey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [
      createMemoInstruction("this is a test memo", [walletPubkey]),
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);

  console.log("sending a memo signed by:", walletPubkey.toBase58());

  const signedTx = await walletContext.signTransaction(tx);

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
