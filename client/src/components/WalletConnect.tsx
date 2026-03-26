import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@onelabs/dapp-kit'
import { useEffect } from 'react'

interface Props {
  wallet:    string | null
  onConnect: (addr: string) => void
}

export default function WalletConnect({ wallet, onConnect }: Props) {
  const account = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()

  // Sync dapp-kit account into App state whenever it changes
  useEffect(() => {
    if (account?.address && account.address !== wallet) {
      onConnect(account.address)
    }
  }, [account?.address])

  if (account) {
    const short = account.address.slice(0, 6) + '...' + account.address.slice(-4)
    return (
      <div className="wallet-wrap">
        <div className="wallet-connected">
          <div className="wallet-dot" />
          <span className="wallet-addr">{short}</span>
          <button className="wallet-disconnect" onClick={() => disconnect()}>
            DISCONNECT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-wrap">
      <ConnectButton className="wallet-btn" connectText="◈ CONNECT ONEWALLET" />
    </div>
  )
}