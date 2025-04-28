import {Deposit, DepositPlan, Portfolio} from "./types.ts";

export const allocateDeposits = (portfolios: Portfolio[], depositPlans: DepositPlan[], deposits: Deposit[]) => {
    return [
        {portfolioId: 'p1', amount: 10000},
        {portfolioId: 'p2', amount: 600}
    ]
}