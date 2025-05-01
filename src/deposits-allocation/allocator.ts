import {Deposit, DepositPlan, PlanType, Portfolio, PortfolioAllocation} from './types.ts';
import {areAllAmountsZeros, getRemainingToFulfill, isPlanEligible, isPlanFulfilled} from "./utils.ts";
import Decimal from 'decimal.js';


const distributeProportionally = (
    allocations: { portfolioId: string, amount: number }[],
    totalToDistribute: number,
    result: PortfolioAllocation[]
): void => {
    const total = allocations.reduce((sum, a) => sum + a.amount, 0);
    const resultMap = new Map(result.map(r => [r.portfolioId, r]));

    for (const a of allocations) {
        const share = new Decimal(a.amount).div(total);
        const extra = share.mul(totalToDistribute).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        const r = resultMap.get(a.portfolioId);
        if (r) {
            r.amount = new Decimal(r.amount).plus(extra).toNumber();
        }
    }
};


const applyPlanToResult = (
    plan: DepositPlan,
    depositAmount: number,
    result: PortfolioAllocation[],
    planFulfillment: Record<string, number>
): number => {
    const remainingToFulfill = new Decimal(getRemainingToFulfill(plan, planFulfillment));
    const depositDecimal = new Decimal(depositAmount);

    const amountToApply = Decimal.min(depositDecimal, remainingToFulfill);
    const ratio = amountToApply.div(plan.totalAmount);

    const resultMap = new Map(result.map(pa => [pa.portfolioId, pa]));

    for (const planAllocation of plan.allocations) {
        const portfolioAllocation = resultMap.get(planAllocation.portfolioId);
        if (!portfolioAllocation) continue;

        const allocationAmount = new Decimal(planAllocation.amount);

        const amountToAdd = ratio.equals(1)
            ? allocationAmount
            : allocationAmount.mul(ratio).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

        portfolioAllocation.amount = new Decimal(portfolioAllocation.amount)
            .plus(amountToAdd)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            .toNumber();
    }

    return depositDecimal.minus(amountToApply).toNumber();
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
    const allocationsResult: PortfolioAllocation[] = portfolios.map(p => ({
        portfolioId: p.id,
        amount: 0
    }));

    const allAmountsAreZeros = areAllAmountsZeros(depositPlans);
    if (allAmountsAreZeros) {
        const totalAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
        const share = totalAmount / portfolios.length;
        return portfolios.map(p => ({portfolioId: p.id, amount: share}));
    }

    const workingPlans = depositPlans.map(plan => structuredClone(plan));
    const oneTimePlan = workingPlans.find(p => p.type === PlanType.ONE_TIME);
    const monthlyPlan = workingPlans.find(p => p.type === PlanType.MONTHLY);

    const planFulfillment: Record<string, number> = oneTimePlan ? {[oneTimePlan.id]: 0} : {};

    for (const deposit of deposits) {
        let remaining = deposit.amount;

        if (oneTimePlan) {
            remaining = fulfillPlans([oneTimePlan], PlanType.ONE_TIME, remaining, allocationsResult, planFulfillment);
        }

        if (monthlyPlan && remaining > 0) {
            remaining = fulfillPlans([monthlyPlan], PlanType.MONTHLY, remaining, allocationsResult, planFulfillment);
        }

        if (!monthlyPlan && oneTimePlan && remaining > 0) {
            distributeProportionally(oneTimePlan.allocations, remaining, allocationsResult);
        }
    }

    return allocationsResult;
};