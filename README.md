# GMONAD MessageBoard
[![image (111)](https://github.com/user-attachments/assets/4ded2af5-ca4f-4c19-b35f-7cf2e72e6a3d)](https://g-monad.fun)

https://g-monad.fun

## Overview
GMonad Message Board is a decentralized application (dApp) built on Monad Testnet, allowing users to post messages on-chain by paying a fee of 0.1 TMON. The contract distributes the fee as follows:

- 80% (0.08 TMON) is added to a pot, which users have a 10% chance of winning with each post
- 20% (0.02 TMON) goes directly to the contract owner (the deployer) with each message

The contract includes comprehensive admin controls for the owner to manage various parameters and includes message retrieval functionality.

## Features
- **Post Messages**: Users can post messages by sending exactly 0.1 TMON
- **Fee Distribution**: Automatically sends 0.02 TMON to the owner and adds 0.08 TMON to the pot per message
- **Winner Mechanism**: 10% chance for the message sender to win the entire pot with each post
- **Admin Controls**: The owner can:
  - Set message cost
  - Adjust winning chance percentage
  - Modify pot share percentage
  - Add funds to the pot
  - Withdraw the entire pot
- **Message History**: Anyone can view all posted messages from both old and new contracts
- **Admin Panel**: Dedicated interface for contract owner to manage all parameters

## Contract Details
- **Solidity Version**: ^0.8.0
- **License**: MIT
- **Token**: Uses TMON (Monad Testnet's native token)
- **Contracts**:
  - Old Contract: `0xfCCA382b4758a9414B85EaA9E6462124e8505082`
  - New Contract: `0xd7f3dE42f3A31bbEE307BF883c3A698d37C00e54`

## Key Functions
- `postMessage(string memory _content)`: Posts a message (costs 0.1 TMON)
- `getAllMessages()`: Returns all messages (view function)
- `getPotSize()`: Returns the current pot size (view function)
- `setMessageCost(uint256 _newCost)`: Sets new message cost (owner only until end of testing phase)
- `setWinningPercentage(uint256 _newPercentage)`: Sets new winning chance (owner only until end of testing phase)
- `setPotSharePercentage(uint256 _newPercentage)`: Sets new pot share percentage (owner only until end of testing phase)
- `addFundsToPot()`: Adds funds to the pot (owner only until end of testing phase)
- `withdrawPot()`: Allows the owner to withdraw the entire pot (owner only until end of testing phase)

## Events
- `NewMessage(address sender, string content, uint256 timestamp)`: Emitted when a message is posted
- `FeeDistributed(address owner, uint256 ownerAmount, uint256 potAmount)`: Emitted when fees are distributed
- `PotWon(address winner, uint256 amount)`: Emitted when a user wins the pot
- `FundsWithdrawn(address owner, uint256 amount)`: Emitted when the owner withdraws the pot
- `MessageCostUpdated(uint256 newCost)`: Emitted when message cost is updated
- `WinningPercentageUpdated(uint256 newPercentage)`: Emitted when winning chance is updated
- `PotSharePercentageUpdated(uint256 newPercentage)`: Emitted when pot share is updated

## How It Works
1. **Deployment**: The contract is deployed by an owner, who receives 0.02 TMON per message posted
2. **Posting Messages**: Users call `postMessage` with 0.1 TMON, storing their message on-chain
3. **Fee Split**:
   - 0.02 TMON is instantly transferred to the owner's wallet
   - 0.08 TMON is added to the pot
4. **Winning the Pot**: Each message has a 10% chance (randomly determined) to win the entire pot
5. **Admin Management**: The owner can:
   - Adjust message cost
   - Change winning probability
   - Modify pot share percentage
   - Add or withdraw funds from the pot

## Frontend
1. **Main Interface** (`index.html`):
   - Connect wallet
   - Post messages
   - View message history
   - See current pot size
   - View recent winners


## Getting Started
1. Connect to Monad Testnet in your wallet
2. Visit the main interface to post messages
3. Contract owner can access the admin panel to manage parameters

## Network Details
- **Network**: Monad Testnet
- **Chain ID**: 10143 (0x279F)
- **RPC URL**: https://rpc.testnet.monad.xyz/
- **Block Explorer**: https://explorer.testnet.monad.xyz/
- **Native Token**: TMON
