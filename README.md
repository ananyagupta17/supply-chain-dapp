# SupplyChain DApp

A smart contract system for tracking physical products across a supply chain on Ethereum. Every product registration, custody transfer, and stage update is recorded on-chain — creating a tamper-proof audit trail that any party can independently verify.

---

## The Problem

Traditional supply chain databases are centralized. A manufacturer, logistics company, or retailer each maintain their own records — and those records can be edited, faked, or simply disagree with each other. Counterfeit goods enter supply chains precisely because there's no single source of truth that everyone trusts.

## The Solution

This contract puts the product's entire history on a public blockchain:
- The manufacturer registers the product — that record is permanent
- Every handoff between parties is a signed transaction from a real wallet
- Every stage update is verified by the contract and logged as an immutable event
- Anyone with the product ID can look up its full history — no login, no trust required

---

## How It Works

### Roles
| Role | Description |
|---|---|
| **Admin** | The deployer. Only admin can register new products. |
| **Owner** | Whoever currently holds a product. Can update its stage and transfer it. |
| **Anyone** | Can view any product's details and history via `getProduct()`. |

### Product Lifecycle
```
[Admin registers product]
        │
        ▼
  Manufactured (0)
        │
        ▼  updateStage() by current owner
   Shipped (1)
        │
        ▼  transferOwnership() → distributor takes over
   InTransit (2)
        │
        ▼  transferOwnership() → retailer takes over
   Delivered (3)
```

Stages can only move **forward, one step at a time**. The contract enforces this — there's no way to skip or reverse a stage.

### On-Chain Events
Every action emits an event — a permanent log entry on the blockchain:
```
ProductRegistered(id, name, owner)
StageUpdated(id, newStage, updatedBy)
OwnershipTransferred(id, from, to)
```
These events are how external systems (frontends, indexers, auditors) track what happened without reading raw contract storage.

---

## Contract Design

### Data Structures

```solidity
enum Stage { Manufactured, Shipped, InTransit, Delivered }

struct Product {
    uint256 id;
    string name;
    string description;
    address owner;       // current custodian's wallet
    Stage stage;
    uint256 timestamp;   // last updated
    bool exists;         // guards against invalid lookups
}

mapping(uint256 => Product) public products;
```

### Access Control
Three modifiers gate every function:

```solidity
modifier onlyAdmin()                // only the deployer
modifier onlyOwner(uint256 _id)     // only current product custodian
modifier productExists(uint256 _id) // product ID must be valid
```

### Functions

| Function | Access | Description |
|---|---|---|
| `registerProduct(name, desc)` | Admin | Creates a new product at stage 0 |
| `updateStage(id, newStage)` | Owner | Advances product by exactly one stage |
| `transferOwnership(id, newOwner)` | Owner | Transfers custody to another address |
| `getProduct(id)` | Public | Returns full product struct |

### Security Decisions
- **Stage can only increment by 1** — prevents jumping from Manufactured to Delivered
- **State never goes backwards** — no way to "undo" a delivery
- **Zero address check** — can't transfer to `0x000...000` (the burn address)
- **`exists` flag** — clean error on invalid product ID instead of returning empty data
- **CEI pattern** — state is updated before any external interactions

---

## Project Structure

```
supply-chain-dapp/
├── contracts/
│   └── SupplyChain.sol       # Core contract (~120 lines)
├── test/
│   └── SupplyChain.js        # 16 unit tests
├── scripts/
│   └── deploy.js             # Hardhat deployment script
├── hardhat.config.js
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm

### Install
```bash
git clone https://github.com/ananyagupta17/supply-chain-dapp.git
cd supply-chain-dapp
npm install
```

### Compile
```bash
npx hardhat compile
```

### Test
```bash
npx hardhat test
```

Expected output: **16 passing**

### Deploy (local)
```bash
npx hardhat run scripts/deploy.js
```

---

## Tests

16 tests across 4 describe blocks:

```
registerProduct()
  ✔ allows admin to register a product
  ✔ stores product data correctly
  ✔ rejects non-admin from registering a product
  ✔ increments product ID correctly for multiple products

updateStage()
  ✔ allows owner to advance stage forward
  ✔ moves through all stages correctly
  ✔ rejects skipping stages
  ✔ rejects going backwards in stage
  ✔ rejects non-owner from updating stage
  ✔ rejects update on non-existent product

transferOwnership()
  ✔ transfers ownership to a new address
  ✔ new owner can update stage after transfer
  ✔ old owner cannot update stage after transfer
  ✔ rejects transfer to zero address
  ✔ rejects transfer by non-owner

Full supply chain journey
  ✔ tracks a product from manufacture to delivery
```

The final integration test simulates a full real-world flow:
Admin registers → ships → hands off to distributor → distributor marks in transit → hands off to retailer → retailer marks delivered.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Solidity 0.8.20 | Smart contract language |
| Hardhat 2.x | Local blockchain, compiler, test runner |
| Ethers.js v6 | JS ↔ contract interaction |
| Mocha + Chai | Test framework and assertions |
| Node.js | Runtime |

---

