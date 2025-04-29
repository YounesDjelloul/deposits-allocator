import {Portfolio, DepositPlan, Deposit, PortfolioAllocation, PlanType} from './types';

const selectPlanForDeposit = (
    deposit: Deposit,
    depositPlans: DepositPlan[]
): DepositPlan | null => {
    let oneTimePlan: DepositPlan | undefined;
    let monthlyPlan: DepositPlan | undefined;

    for (const plan of depositPlans) {
        if (!plan.isActive) continue;

        if (plan.type === PlanType.ONE_TIME) oneTimePlan = plan;
        else if (plan.type === PlanType.MONTHLY) monthlyPlan = plan;

        if (oneTimePlan && monthlyPlan) break;
    }

    if (oneTimePlan) {
        return oneTimePlan;
    }

    if (monthlyPlan && deposit.amount === monthlyPlan.totalAmount) {
        return monthlyPlan;
    }

    return null;
};


const applyPlanToResult = (
    plan: DepositPlan,
    deposit: Deposit,
    result: PortfolioAllocation[]
): void => {
    const ratio = deposit.amount / plan.totalAmount;

    const resultMap = new Map(result.map(pa => [pa.portfolioId, pa]));

    for (const planAllocation of plan.allocations) {
        const portfolioAllocation = resultMap.get(planAllocation.portfolioId);
        if (!portfolioAllocation) continue;

        const amountToAdd = deposit.amount === plan.totalAmount
            ? planAllocation.amount
            : Math.round(planAllocation.amount * ratio * 100) / 100;

        portfolioAllocation.amount += amountToAdd;
    }
};


const isPlanFulfilled = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>,
): boolean => {
    return planFulfillment[plan.id] >= plan.totalAmount
}

export const allocateDeposits = (
    portfolios: Portfolio[],
    depositPlans: DepositPlan[],
    deposits: Deposit[]
): PortfolioAllocation[] => {
    const result: PortfolioAllocation[] = portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: 0
    }));

    const planFulfillment: Record<string, number> = {};

    for (const plan of depositPlans) {
        if (plan.type === PlanType.ONE_TIME) {
            planFulfillment[plan.id] = 0;
        }
    }

    for (const deposit of deposits) {
        const selectedPlan = selectPlanForDeposit(deposit, depositPlans);

        if (selectedPlan) {
            applyPlanToResult(selectedPlan, deposit, result);

            if (selectedPlan.type === PlanType.ONE_TIME) {
                planFulfillment[selectedPlan.id] += deposit.amount;

                if (isPlanFulfilled(selectedPlan, planFulfillment)) {
                    selectedPlan.isActive = false;
                }
            }
        }
    }

    return result;
};