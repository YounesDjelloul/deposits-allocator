import {Deposit, DepositPlan, Portfolio, PortfolioAllocation} from './model.ts';

import {calculateAllocations} from './logic';

export const allocateDeposits = (
    portfolios: Portfolio[],
    depositPlans: DepositPlan[],
    deposits: Deposit[]
): PortfolioAllocation[] => {

    return calculateAllocations(portfolios, depositPlans, deposits);
};