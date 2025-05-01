# Deposit Allocator

A TypeScript solution for allocating deposits across investment portfolios based on predefined plans.

## Overview

This solution implements a system for allocating financial deposits across multiple investment portfolios according to
configurable allocation plans. It follows the Functional Core/Imperative Shell architectural pattern to ensure code
robustness, testability, and maintainability.

## Features

- Allocate deposits according to one-time and monthly investment plans
- Handle partial fulfillment of investment plans
- Distribute remaining funds proportionally when deposits exceed plan amounts
- Fall back to equal distribution when no specific allocation rules exist
- Support for precise decimal calculations with arbitrary precision

## Usage

### Basic Example

```typescript
import {allocateDeposits} from 'deposit-allocator';
import {Deposit, DepositPlan, PlanType, Portfolio} from 'deposit-allocator/types';

// Define your portfolios
const portfolios: Portfolio[] = [
    {id: 'p1', name: 'High risk'},
    {id: 'p2', name: 'Retirement'}
];

// Define your deposit plans
const depositPlans: DepositPlan[] = [
    {
        id: 'dp1',
        type: PlanType.ONE_TIME,
        allocations: [
            {portfolioId: 'p1', amount: 10000},
            {portfolioId: 'p2', amount: 500}
        ],
        isActive: true,
        totalAmount: 10500
    },
    {
        id: 'dp2',
        type: PlanType.MONTHLY,
        allocations: [
            {portfolioId: 'p1', amount: 0},
            {portfolioId: 'p2', amount: 100}
        ],
        isActive: true,
        totalAmount: 100
    }
];

// Define your deposits
const deposits: Deposit[] = [
    {id: 'd1', amount: 10500, referenceCode: 'ref123', timestamp: new Date('2025-04-01')},
    {id: 'd2', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')}
];

// Allocate deposits to portfolios
const result = allocateDeposits(portfolios, depositPlans, deposits);

console.log(result);
// Output:
// [
//   { portfolioId: 'p1', amount: 10000 },
//   { portfolioId: 'p2', amount: 600 }
// ]
```

## Allocation Rules

The allocation process follows these rules:

1. One-time plans are prioritized over monthly plans
2. Plans are fulfilled in order of deposits
3. When a one-time plan is fully funded, it becomes inactive
4. Remaining deposit amounts are allocated to monthly plans
5. If there's still money left, it's distributed proportionally based on one-time plan allocations
6. If no specific allocation rules apply, deposits are distributed equally across portfolios

## Architecture

The solution follows the Functional Core/Imperative Shell pattern:

- **Functional Core**: Pure functions without side effects that contain all business logic
- **Imperative Shell**: Thin layer handling side effects and external dependencies

## Dependencies

- `decimal.js`: For precise financial calculations

## Development

### Installing Dependencies

```bash
npm install
```

### Running Tests

```bash
npm test
```

### Building (NOTE: No interface has been built for the solution yet!)

```bash
npm run build
```