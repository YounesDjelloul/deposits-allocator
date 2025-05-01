import {Deposit, DepositPlan, PlanType, Portfolio, PortfolioAllocation} from './types.ts';
import {getRemainingToFulfill, isPlanEligible, isPlanFulfilled} from "./utils.ts";


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

const fulfillPlans = (
    plans: DepositPlan[],
    planType: PlanType,
    remainingAmount: number,
    result: PortfolioAllocation[],
    planFulfillment: Record<string, number>
): number => {
    for (const plan of plans) {
        if (!isPlanEligible(plan, remainingAmount, planType)) continue;

        const amountBeforeApply = remainingAmount;
        remainingAmount = applyPlanToResult(plan, remainingAmount, result, planFulfillment);
        const appliedAmount = amountBeforeApply - remainingAmount;

        if (planType === PlanType.ONE_TIME) {
            planFulfillment[plan.id] += appliedAmount;
            if (isPlanFulfilled(plan, planFulfillment)) {
                plan.isActive = false;
            }
        }
    }

    return remainingAmount;
};


export const allocateDeposits = (
    portfolios: Portfolio[],
    depositPlans: DepositPlan[],
    deposits: Deposit[]
): PortfolioAllocation[] => {
    const allocationsResult: PortfolioAllocation[] = portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: 0
    }));

    const workingPlans = depositPlans.map(plan => structuredClone(plan));

    const planFulfillment = workingPlans
        .filter(plan => plan.type === PlanType.ONE_TIME)
        .reduce<Record<string, number>>((acc, plan) => {
            acc[plan.id] = 0;
            return acc;
        }, {});

    for (const deposit of deposits) {
        let remainingAmount = deposit.amount;

        // fulfill one-time plans first
        remainingAmount = fulfillPlans(workingPlans, PlanType.ONE_TIME, remainingAmount, allocationsResult, planFulfillment);

        // then fulfill monthly plans
        if (remainingAmount > 0) {
            fulfillPlans(workingPlans, PlanType.MONTHLY, remainingAmount, allocationsResult, planFulfillment);
        }
    }


    return allocationsResult;
};