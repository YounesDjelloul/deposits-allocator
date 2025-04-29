import {Deposit, DepositPlan, PlanType, Portfolio, PortfolioAllocation} from "./types.ts";

export const allocateDeposits = (portfolios: Portfolio[], depositPlans: DepositPlan[], deposits: Deposit[]): PortfolioAllocation[] => {
    const result: PortfolioAllocation[] = portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: 0
    }));

    for (const deposit of deposits) {
        const oneTimePlan = depositPlans.find(
            plan => plan.type === PlanType.ONE_TIME && plan.isActive
        );

        const monthlyPlan = depositPlans.find(
            plan => plan.type === PlanType.MONTHLY && plan.isActive
        );

        let planToUse: DepositPlan | null = null;

        if (oneTimePlan && deposit.amount === oneTimePlan.totalAmount) {
            planToUse = oneTimePlan;
            oneTimePlan.isActive = false;
        } else if (monthlyPlan && deposit.amount === monthlyPlan.totalAmount) {
            planToUse = monthlyPlan;
        } else {
            // There is none exact matches

            if (oneTimePlan) {
                planToUse = oneTimePlan;
                oneTimePlan.isActive = false;
            } else if (monthlyPlan) {
                planToUse = monthlyPlan;
            }
        }

        if (planToUse) {
            for (const planAllocation of planToUse.allocations) {
                const portfolioAllocation = result.find(
                    pa => pa.portfolioId === planAllocation.portfolioId
                );

                if (portfolioAllocation) {
                    portfolioAllocation.amount += planAllocation.amount;
                }
            }
        }
    }

    return result;
}