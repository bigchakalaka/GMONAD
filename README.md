# GMONAD MessageBoard

## Overview
`MessageBoard` is a decentralized application (dApp) built on Ethereum, allowing users to post messages on-chain by paying a fee of 1 TMON (a fictional token represented as 1 Ether in this contract). The contract distributes the fee as follows:
- **20% (0.2 TMON)** goes directly to the contract owner (the deployer) with each message.
- **80% (0.8 TMON)** is added to a pot, which users have a 1% chance of winning with each post.

The contract also allows the owner to withdraw the entire pot at any time and includes basic message retrieval functionality.

## Features
- **Post Messages**: Users can post messages by sending exactly 1 TMON.
- **Fee Distribution**: Automatically sends 0.2 TMON to the owner and adds 0.8 TMON to the pot per message.
- **Winner Mechanism**: 1% chance for the message sender to win the entire pot with each post.
- **Owner Controls**: The owner can withdraw the pot at any time.
- **Message History**: Anyone can view all posted messages.

## Contract Details
- **Solidity Version**: `^0.8.0`
- **License**: MIT
- **Token**: Uses Ether as TMON (1 TMON = 1 Ether for simplicity)

### Key Functions
- `postMessage(string memory _content)`: Posts a message (costs 1 TMON).
- `getAllMessages()`: Returns all messages (view function).
- `getPotSize()`: Returns the current pot size (view function).
- `withdrawPot()`: Allows the owner to withdraw the entire pot (restricted to owner).

### Events
- `NewMessage(address sender, string content, uint256 timestamp)`: Emitted when a message is posted.
- `FeeDistributed(address owner, uint256 ownerAmount, uint256 potAmount)`: Emitted when fees are distributed.
- `PotWon(address winner, uint256 amount)`: Emitted when a user wins the pot.
- `FundsWithdrawn(address owner, uint256 amount)`: Emitted when the owner withdraws the pot.

## How It Works
1. **Deployment**: The contract is deployed by an owner, who receives 0.2 TMON per message posted.
2. **Posting Messages**: Users call `postMessage` with 1 TMON, storing their message on-chain.
3. **Fee Split**: 
   - 0.2 TMON is instantly transferred to the owner’s wallet.
   - 0.8 TMON is added to the pot.
4. **Winning the Pot**: Each message has a 1% chance (randomly determined) to win the entire pot, which is then transferred to the sender.
5. **Owner Withdrawal**: The owner can call `withdrawPot` to take all funds in the pot.

## Prerequisites
- [Solidity](https://soliditylang.org/) `^0.8.0`
- [Ethereum Development Environment](https://hardhat.org/ or https://remix.ethereum.org/)
- An Ethereum wallet (e.g., MetaMask) with Ether for testing on a testnet.

## Installation & Deployment
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
