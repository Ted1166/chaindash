import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { createNetworkConfig } from '@mysten/dapp-kit'
import App from './App'
import './index.css'
import '@mysten/dapp-kit/dist/index.css'

const { networkConfig } = createNetworkConfig({
  testnet: {
    url: 'https://fullnode.testnet.sui.io:443',
    network: 'testnet'
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