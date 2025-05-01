import {Deposit, DepositPlan, PlanType, Portfolio, PortfolioAllocation} from './types.ts';
import {areAllAmountsZeros, getRemainingToFulfill, isPlanEligible, isPlanFulfilled} from "./utils.ts";
import Decimal from 'decimal.js';


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
    const allocationsResult: PortfolioAllocation[] = portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: 0
    }));

    const allAmountsAreZeros = areAllAmountsZeros(depositPlans);

    if (allAmountsAreZeros) {
        const totalDepositAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
        const equalShare = totalDepositAmount / portfolios.length;

        return portfolios.map(p => ({
            portfolioId: p.id,
            amount: equalShare
        }));
    }

    const workingPlans = depositPlans.map(plan => structuredClone(plan));

    const planFulfillment = workingPlans
        .filter(plan => plan.type === PlanType.ONE_TIME)
        .reduce<Record<string, number>>((acc, plan) => {
            acc[plan.id] = 0;
            return acc;
        }, {});

    for (const deposit of deposits) {
        let remainingAmount = deposit.amount;

        // fulfill one-time plan first
        remainingAmount = fulfillPlans(workingPlans, PlanType.ONE_TIME, remainingAmount, allocationsResult, planFulfillment);

        // try fulfilling monthly plan
        const monthlyPlan = workingPlans.find(p => p.type === PlanType.MONTHLY);
        if (monthlyPlan && remainingAmount > 0) {
            remainingAmount = fulfillPlans(workingPlans, PlanType.MONTHLY, remainingAmount, allocationsResult, planFulfillment);
        }

        // fallback: if leftover and no monthly plan, re-use one-time allocations proportionally
        if (!monthlyPlan && remainingAmount > 0) {
            const oneTimePlan = workingPlans.find(p => p.type === PlanType.ONE_TIME);
            if (oneTimePlan) {
                const total = oneTimePlan.allocations.reduce((sum, a) => sum + a.amount, 0);
                const resultMap = new Map(allocationsResult.map(a => [a.portfolioId, a]));

                for (const allocation of oneTimePlan.allocations) {
                    const share = new Decimal(allocation.amount).div(total);
                    const extra = share.mul(remainingAmount).toDecimalPlaces(2);

                    const portfolioAlloc = resultMap.get(allocation.portfolioId);
                    if (portfolioAlloc) {
                        portfolioAlloc.amount = new Decimal(portfolioAlloc.amount).plus(extra).toNumber();
                    }
                }
            }
        }
    }

    return allocationsResult;
};