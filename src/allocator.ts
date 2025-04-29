import {Portfolio, DepositPlan, Deposit, PortfolioAllocation, PlanType, PlanSelectionResult} from './types';

const selectPlanForDeposit = (
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

    if (oneTimePlan && deposit.amount === oneTimePlan.totalAmount) {
        return {plan: oneTimePlan, shouldDeactivate: true};
    }

    if (monthlyPlan && deposit.amount === monthlyPlan.totalAmount) {
        return {plan: monthlyPlan, shouldDeactivate: false};
    }

    return null;
};


const applyPlanToResult = (
    plan: DepositPlan,
    result: PortfolioAllocation[]
): void => {
    for (const planAllocation of plan.allocations) {
        const portfolioAllocation = result.find(
            pa => pa.portfolioId === planAllocation.portfolioId
        );

        if (portfolioAllocation) {
            portfolioAllocation.amount += planAllocation.amount;
        }
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
            applyPlanToResult(planSelection.plan, result);

            if (planSelection.shouldDeactivate) {
                planSelection.plan.isActive = false;
            }
        }
    }

    return result;
};