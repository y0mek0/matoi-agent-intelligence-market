import path from "node:path";
import dotenv from "dotenv";
import { CircleDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const id = process.argv[2];
const client = new CircleDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY ?? "", entitySecret: process.env.CIRCLE_ENTITY_SECRET ?? "" });

for (let i = 0; i < 10; i += 1) {
  const res = await client.getTransaction({ id });
  const tx = res.data?.transaction ?? res.data;
  console.log(JSON.stringify({
    attempt: i + 1,
    id: tx?.id,
    state: tx?.state,
    txHash: tx?.txHash ?? tx?.transactionHash ?? null,
    blockchain: tx?.blockchain,
    tokenId: tx?.tokenId,
    amount: tx?.amounts ?? tx?.amount,
  }));
  if (["SENT", "CONFIRMED", "COMPLETE"].includes(tx?.state) || tx?.txHash || tx?.transactionHash) break;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
