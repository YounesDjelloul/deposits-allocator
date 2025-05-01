import {Portfolio, DepositPlan, Deposit, PortfolioAllocation, PlanType} from './types';


const getRemainingToFulfill = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>
): number => {
    const fulfilledAmount = planFulfillment[plan.id] || 0;

    return plan.type === PlanType.ONE_TIME
        ? Math.max(0, plan.totalAmount - fulfilledAmount)
        : plan.totalAmount;
};

const applyPlanToResult = (
    plan: DepositPlan,
    depositAmount: number,
    result: PortfolioAllocation[],
    planFulfillment: Record<string, number>
): number => {
    const remainingToFulfill = getRemainingToFulfill(plan, planFulfillment);

    const amountToApply = Math.min(depositAmount, remainingToFulfill);
    const ratio = amountToApply / plan.totalAmount;

    const resultMap = new Map(result.map(pa => [pa.portfolioId, pa]));

    for (const planAllocation of plan.allocations) {
        const portfolioAllocation = resultMap.get(planAllocation.portfolioId);
        if (!portfolioAllocation) continue;

        const amountToAdd = ratio === 1
            ? planAllocation.amount
            : Math.round(planAllocation.amount * ratio * 100) / 100;

        portfolioAllocation.amount += amountToAdd;
    }

    return Math.max(0, depositAmount - amountToApply);
};

const isPlanFulfilled = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>,
): boolean => {
    return planFulfillment[plan.id] >= plan.totalAmount;
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

    const workingPlans = JSON.parse(JSON.stringify(depositPlans)) as DepositPlan[];

    const planFulfillment = workingPlans
        .filter(plan => plan.type === PlanType.ONE_TIME)
        .reduce<Record<string, number>>((acc, plan) => {
            acc[plan.id] = 0;
            return acc;
        }, {});

    for (const deposit of deposits) {
        let remainingAmount = deposit.amount;

        for (let i = 0; i < workingPlans.length && remainingAmount > 0; i++) {
            const plan = workingPlans[i];

            if (!plan.isActive) continue;

            if (plan.type === PlanType.ONE_TIME) {
                const appliedAmount = deposit.amount - remainingAmount;
                remainingAmount = applyPlanToResult(plan, remainingAmount, result, planFulfillment);

                planFulfillment[plan.id] += (deposit.amount - appliedAmount - remainingAmount);

                if (isPlanFulfilled(plan, planFulfillment)) {
                    plan.isActive = false;
                }
            }
        }

        if (remainingAmount > 0) {
            for (let i = 0; i < workingPlans.length && remainingAmount > 0; i++) {
                const plan = workingPlans[i];

                if (!plan.isActive || plan.type === PlanType.ONE_TIME) continue;

                if (plan.type === PlanType.MONTHLY && remainingAmount === plan.totalAmount) {
                    remainingAmount = applyPlanToResult(plan, remainingAmount, result, planFulfillment);
                }
            }
        }
    }

    return result;
};