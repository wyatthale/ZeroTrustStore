import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="zt-header">
      <div className="zt-header__brand">
        <div className="zt-logo-dot" />
        <div>
          <p className="zt-eyebrow">ZeroTrust Store</p>
          <h1 className="zt-title">Encrypted file drop</h1>
        </div>
      </div>
      <div className="zt-header__actions">
        <span className="zt-network">Sepolia</span>
        <ConnectButton />
      </div>
    </header>
  );
}
