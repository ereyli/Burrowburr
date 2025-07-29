# Burrow dApp - Frontend

🦫 **The ultimate meme mining game on Starknet!**

A React-based decentralized application for the BurrowGame, featuring a clean, fun interface themed around cartoon beavers mining for $BURR tokens.

## Features

- **🏦 Wallet Integration**: Connect with ArgentX or Braavos wallets
- **🦫 Beaver Staking**: Choose from Noob, Pro, or Degen beavers
- **💰 Real-time Mining**: Watch your $BURR accumulate in real-time
- **⬆️ Upgrade System**: Level up your beaver for higher rewards
- **📱 Responsive Design**: Works on desktop and mobile
- **🎨 Dark Theme**: Earthy colors with beaver-themed UI

## Game Mechanics

### Beaver Types
- **Noob**: 300 $BURR/hour - Cost: 50 $STRK
- **Pro**: 750 $BURR/hour - Cost: 120 $STRK  
- **Degen**: 2,250 $BURR/hour - Cost: 350 $STRK

### Upgrade System
- 5 levels available for each beaver
- Each level increases earnings by progressive multipliers
- Type-specific upgrade costs: 40K-406K $BURR per level

### Game Duration
- 365-day mining period
- 700 million $BURR total reward pool

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.js       # App header with wallet connection
│   ├── WalletInfo.js   # Wallet information panel
│   ├── StakePanel.js   # Beaver staking interface
│   ├── ClaimPanel.js   # Rewards claiming interface
│   ├── UpgradePanel.js # Beaver upgrade interface
│   └── Footer.js       # App footer with links
├── utils/
│   └── constants.js    # Game constants and contract addresses
├── App.js              # Main application component
└── index.css           # Global styles with TailwindCSS
```

## Contracts (Starknet Mainnet)

- **BURR Token**: `0x01bc7c8ce3b8fe74e4870adc2965df850d429048e83fad93f3140f52ecb74add`
- **Burrow Game**: `0x0340b156113539f6f6a82723ca8f79c283a8c1868ecb0b8b815d4491a38b51bc`
- **STRK Token**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

## Technology Stack

- **Frontend**: React 19, TailwindCSS
- **Blockchain**: Starknet Mainnet
- **Wallet**: Starknet.js, get-starknet-core
- **Smart Contracts**: Cairo 2

## Development Status

✅ **Current Features**:
- Complete UI/UX implementation
- Real Starknet mainnet integration
- Smart contract interaction
- Real-time blockchain data
- Transaction signing and submission
- Beaver staking, upgrading, and claiming system

🚀 **Live on Mainnet**:
- Production-ready deployment
- Full wallet integration
- Real token economics
- Security audited contracts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Community

- 🐦 **Twitter**: [@burrowgame](https://twitter.com/burrowgame)
- 💬 **Discord**: [Join our community](https://discord.gg/burrowgame)
- 📊 **DexScreener**: [View $BURR](https://dexscreener.com/starknet/burr)

---

**Built with ❤️ for the meme mining community!** 🦫⛏️
