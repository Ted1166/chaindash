import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit'
import { createNetworkConfig } from '@onelabs/dapp-kit'
// import { getFullnodeUrl } from '@onelabs/sui/client'
import App from './App'
import './index.css'
import '@onelabs/dapp-kit/dist/index.css'

// OneChain testnet config
const { networkConfig } = createNetworkConfig({
  testnet: {
    url: 'https://rpc-testnet.onelabs.cc:443',
  },
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
)