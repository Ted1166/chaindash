import {
  ConnectButton,
  useCurrentAccount,
  useDisconnectWallet,
} from '@mysten/dapp-kit'

interface Props {
  compact?: boolean
}

export default function WalletConnect({ compact }: Props) {
  const account = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()

  if (!account) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {!compact && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
            Connect your wallet to play and compete on-chain.
          </p>
        )}
        <ConnectButton connectText="Connect OneWallet" />
      </div>
    )
  }

  const short = `${account.address.slice(0, 6)}…${account.address.slice(-4)}`

  if (compact) {
    return (
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {short}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        fontFamily: 'monospace',
        background: 'var(--color-background-secondary)',
        padding: '4px 10px',
        borderRadius: 6,
        border: '0.5px solid var(--color-border-tertiary)',
      }}>
        {short}
      </span>
      <button
        onClick={() => disconnect()}
        style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
      >
        Disconnect
      </button>
    </div>
  )
}
