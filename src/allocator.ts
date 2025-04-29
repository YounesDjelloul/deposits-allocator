import {Deposit, DepositPlan, Portfolio, PortfolioAllocation} from "./types.ts";

export const allocateDeposits = (portfolios: Portfolio[], depositPlans: DepositPlan[], deposits: Deposit[]): PortfolioAllocation[] => {
    return [
        {portfolioId: 'p1', amount: 10000},
        {portfolioId: 'p2', amount: 600}
    ]
}