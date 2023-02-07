import Head from "next/head";
import { Inter } from "@next/font/google";
import styles from "../styles/Home.module.css";
import { createJupiterLimitOrder } from "../transactions/jupiterLimitOrder";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const walletContext = useWallet();
  const { connection } = useConnection();

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <h1>Fuse Testing Ground</h1>
        <WalletMultiButton />
        {walletContext.connected && (
          <>
            <div className={styles.transaction}>
              <button
                onClick={() =>
                  createJupiterLimitOrder(connection, walletContext)
                }
              >
                Jupiter New Limit Order
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}