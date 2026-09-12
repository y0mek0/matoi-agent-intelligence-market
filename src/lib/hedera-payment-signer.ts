import { AccountId, Client, PrivateKey, TokenId, TransferTransaction, TransactionId } from "@hashgraph/sdk";

/**
 * Build and sign a Hedera testnet USDC transfer transaction.
 *
 * The output is a base64-encoded signed transaction body that the x402
 * facilitator can submit on-chain. We sign locally so the facilitator
 * never sees our private key.
 */

export type HederaSignedTransfer = {
  network: "hedera:testnet";
  tokenId: string;
  payToAccountId: string;
  amountInSmallestUnit: string;
  memo: string;
  signedTransactionBase64: string;
  transactionId: string;
};

export type HederaPaymentSignerInput = {
  payerAccountId: string;
  payerPrivateKey: string;
  payToAccountId: string;
  tokenId: string;
  amountInSmallestUnit: string;
  memo: string;
};

const ACCOUNT_ID_PATTERN = /^0\.0\.\d+$/;

function ensureAccountIdFormat(label: string, value: string): void {
  if (!ACCOUNT_ID_PATTERN.test(value)) {
    throw new Error(`invalid Hedera ${label} account id: ${value}`);
  }
}

export async function buildSignedHederaUsdcTransfer(input: HederaPaymentSignerInput): Promise<HederaSignedTransfer> {
  ensureAccountIdFormat("payer", input.payerAccountId);
  ensureAccountIdFormat("payTo", input.payToAccountId);

  const payerAccountId = AccountId.fromString(input.payerAccountId);
  const payToAccountId = AccountId.fromString(input.payToAccountId);
  const tokenId = TokenId.fromString(input.tokenId);

  // Hedera ED25519 keys come as DER-encoded strings starting with "302e..."
  // ECDSA keys come as 0x-prefixed hex. PrivateKey.fromString autodetects.
  const privateKey = PrivateKey.fromString(input.payerPrivateKey);

  const client = Client.forTestnet();
  client.setOperator(payerAccountId, privateKey);

  // Pre-flight validation: amount must be a positive integer string in smallest unit
  if (!/^[1-9]\d*$/.test(input.amountInSmallestUnit)) {
    throw new Error(`amount must be a positive integer string, got: ${input.amountInSmallestUnit}`);
  }

  const transfer = new TransferTransaction()
    .addTokenTransfer(tokenId, payerAccountId, -Number(input.amountInSmallestUnit))
    .addTokenTransfer(tokenId, payToAccountId, Number(input.amountInSmallestUnit))
    .setTransactionId(TransactionId.generate(payerAccountId))
    .setMaxTransactionFee(100_000_000) // 1 HBAR cap, generous for testnet
    .setTransactionMemo(input.memo.slice(0, 100)); // Hedera memo limit

  const signed = await transfer.freezeWith(client).sign(privateKey);
  const bytes = signed.toBytes();
  const transactionId = signed.transactionId?.toString() ?? "";

  return {
    network: "hedera:testnet",
    tokenId: input.tokenId,
    payToAccountId: input.payToAccountId,
    amountInSmallestUnit: input.amountInSmallestUnit,
    memo: input.memo,
    signedTransactionBase64: Buffer.from(bytes).toString("base64"),
    transactionId,
  };
}
