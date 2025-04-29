import {Portfolio, DepositPlan, Deposit, PortfolioAllocation, PlanType, PlanSelectionResult} from './types';

export const selectPlanForDeposit = (
    deposit: Deposit,
    depositPlans: DepositPlan[]
): PlanSelectionResult | null => {
    let oneTimePlan: DepositPlan | undefined;
    let monthlyPlan: DepositPlan | undefined;

    for (const plan of depositPlans) {
        if (!plan.isActive) continue;

        if (plan.type === PlanType.ONE_TIME) oneTimePlan = plan;
        else if (plan.type === PlanType.MONTHLY) monthlyPlan = plan;

        if (oneTimePlan && monthlyPlan) break;
    }

    if (oneTimePlan) {
        const shouldDeactivate = deposit.amount >= oneTimePlan.totalAmount;

        return {plan: oneTimePlan, shouldDeactivate};
    }

    if (monthlyPlan && deposit.amount === monthlyPlan.totalAmount) {
        return {plan: monthlyPlan, shouldDeactivate: false};
    }

    return null;
};


export const applyPlanToResult = (
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


export const allocateDeposits = (
    portfolios: Portfolio[],
    depositPlans: DepositPlan[],
    deposits: Deposit[]
): PortfolioAllocation[] => {
    const result: PortfolioAllocation[] = portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: 0
    }));

    for (const deposit of deposits) {
        const planSelection = selectPlanForDeposit(deposit, depositPlans);

        if (planSelection) {
            applyPlanToResult(planSelection.plan, deposit, result);

            if (planSelection.shouldDeactivate) {
                planSelection.plan.isActive = false;
            }
        }
    }

    return result;
};