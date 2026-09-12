import path from "node:path";
import dotenv from "dotenv";
import { CircleDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

const client = new CircleDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY ?? "",
  entitySecret: process.env.CIRCLE_ENTITY_SECRET ?? "",
});

const wallets = [
  ["Trader", process.env.ARC_TRADER_WALLET_ID],
  ["ArcResearch", process.env.ARC_RESEARCH_WALLET_ID],
  ["Risk", process.env.ARC_RISK_WALLET_ID],
].filter(([, id]) => id);

for (const [role, id] of wallets) {
  const res = await client.getWalletTokenBalance({ id });
  const balances = (res.data?.tokenBalances ?? []).map((balance) => ({
    symbol: balance.token?.symbol,
    name: balance.token?.name,
    tokenId: balance.token?.id,
    amount: balance.amount,
    isNative: balance.token?.isNative,
    blockchain: balance.token?.blockchain,
  }));
  console.log(JSON.stringify({ role, wallet: `${id.slice(0, 4)}...${id.slice(-4)}`, balances }, null, 2));
}
