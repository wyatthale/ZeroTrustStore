import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ZeroTrust Store',
  projectId: 'c57c90b7d3424cf3ae7d271f686c55f4',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: false,
});
