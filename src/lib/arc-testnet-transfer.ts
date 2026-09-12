export type ArcCircleTransferClient = {
  getWalletTokenBalance(input: { id: string }): Promise<unknown>;
  createTransaction(input: {
    walletId: string;
    tokenId: string;
    destinationAddress: string;
    amount: string[];
    fee: { type: "level"; config: { feeLevel: "LOW" | "MEDIUM" | "HIGH" } };
  }): Promise<unknown>;
};

export type ArcTestnetTransferInput = {
  enabled: boolean;
  sourceWalletId?: string;
  destinationAddress?: string;
  tokenId?: string;
  amountUsd: number;
  idempotencyKey: string;
  client: ArcCircleTransferClient;
};

export type ArcTestnetTransferResult = {
  ok: boolean;
  network: "ARC-TESTNET";
  status: "disabled" | "setup_required" | "funding_required" | "submitted" | "failed";
  realUsdcTransfer: boolean;
  amountUsd: number;
  maskedDestination: string | null;
  circleTransactionId: string | null;
  circleState: string | null;
  reason: string;
};

function maskAddress(address?: string) {
  if (!address) return null;
  return address.length <= 12 ? address : `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function readTokenBalances(response: unknown): Array<{ amount?: string; balance?: string; token?: { id?: string; symbol?: string }; tokenId?: string; symbol?: string }> {
  const data = response as { data?: { tokenBalances?: unknown[]; balances?: unknown[] } };
  const balances = data.data?.tokenBalances ?? data.data?.balances ?? [];
  return Array.isArray(balances) ? balances as ReturnType<typeof readTokenBalances> : [];
}

function balanceAmount(balance: ReturnType<typeof readTokenBalances>[number], tokenId: string) {
  const id = balance.token?.id ?? balance.tokenId;
  const symbol = balance.token?.symbol ?? balance.symbol;
  if (id !== tokenId && symbol !== "USDC") return 0;
  return Number(balance.amount ?? balance.balance ?? 0);
}

function readTx(response: unknown) {
  const data = response as { data?: { id?: string; transaction?: { id?: string; state?: string }; state?: string } };
  return {
    id: data.data?.transaction?.id ?? data.data?.id ?? null,
    state: data.data?.transaction?.state ?? data.data?.state ?? null,
  };
}

export async function buildArcTestnetTransfer(input: ArcTestnetTransferInput): Promise<ArcTestnetTransferResult> {
  const amountUsd = Number(input.amountUsd.toFixed(4));
  if (!input.enabled) {
    return { ok: false, network: "ARC-TESTNET", status: "disabled", realUsdcTransfer: false, amountUsd, maskedDestination: maskAddress(input.destinationAddress), circleTransactionId: null, circleState: null, reason: "Set ARC_REAL_USDC_TRANSFER=true to submit Circle testnet USDC transfers." };
  }
  if (!input.sourceWalletId || !input.destinationAddress || !input.tokenId) {
    return { ok: false, network: "ARC-TESTNET", status: "setup_required", realUsdcTransfer: false, amountUsd, maskedDestination: maskAddress(input.destinationAddress), circleTransactionId: null, circleState: null, reason: "Missing source wallet, destination address, or ARC_USDC_TOKEN_ID." };
  }
  if (amountUsd <= 0 || amountUsd > 0.01) {
    return { ok: false, network: "ARC-TESTNET", status: "setup_required", realUsdcTransfer: false, amountUsd, maskedDestination: maskAddress(input.destinationAddress), circleTransactionId: null, circleState: null, reason: "Amount must be > 0 and <= 0.01 for demo-safe provider payout." };
  }
  const balanceResponse = await input.client.getWalletTokenBalance({ id: input.sourceWalletId });
  const available = readTokenBalances(balanceResponse).reduce((max, balance) => Math.max(max, balanceAmount(balance, input.tokenId!)), 0);
  if (available < amountUsd) {
    return { ok: false, network: "ARC-TESTNET", status: "funding_required", realUsdcTransfer: false, amountUsd, maskedDestination: maskAddress(input.destinationAddress), circleTransactionId: null, circleState: null, reason: `Funding required: source wallet has ${available || 0} testnet USDC.` };
  }
  try {
    const tx = await input.client.createTransaction({
      walletId: input.sourceWalletId,
      tokenId: input.tokenId,
      destinationAddress: input.destinationAddress,
      amount: [amountUsd.toFixed(2)],
      fee: { type: "level", config: { feeLevel: "LOW" } },
    });
    const parsed = readTx(tx);
    return { ok: true, network: "ARC-TESTNET", status: "submitted", realUsdcTransfer: true, amountUsd, maskedDestination: maskAddress(input.destinationAddress), circleTransactionId: parsed.id, circleState: parsed.state, reason: "Circle Arc testnet USDC transfer submitted." };
  } catch (error) {
    return { ok: false, network: "ARC-TESTNET", status: "failed", realUsdcTransfer: false, amountUsd, maskedDestination: maskAddress(input.destinationAddress), circleTransactionId: null, circleState: null, reason: error instanceof Error ? error.message : "Circle transfer failed" };
  }
}
