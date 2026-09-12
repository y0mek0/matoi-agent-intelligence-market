# Product

## One-liner

Agent Intelligence Market is a control room where autonomous agents buy bounded intelligence before making a simulated market decision.

## User flow

```mermaid
sequenceDiagram
  participant U as User
  participant N as Nova
  participant P as Policy Engine
  participant T as TelegramPulse
  participant A as ArcResearch
  participant H as Audit Rail
  U->>N: Run autonomous cycle
  N->>P: Request spend approval
  P-->>N: Approve within limits
  N->>T: Buy social signal
  N->>A: Buy USDC market context
  N->>N: Simulate decision
  N->>H: Write audit summary later
  N-->>U: BUY_SMALL_SIMULATED or HOLD
```

## Non-negotiable product boundaries

- Testnet only.
- No mainnet funds.
- No real swap or trade in MVP.
- Fixtures are allowed only with visible data-mode labeling.
- LLMs can summarize and explain, but cannot approve payments or sign transactions.
