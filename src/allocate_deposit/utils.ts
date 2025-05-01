import {DepositPlan, PlanType} from "./types.ts";
import Decimal from "decimal.js";

export const isPlanFulfilled = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>,
): boolean => {
    return new Decimal(planFulfillment[plan.id] || 0).greaterThanOrEqualTo(plan.totalAmount);
};

export const isPlanEligible = (plan: DepositPlan, remainingAmount: number, desiredPlanType: PlanType): boolean => {
    return plan.isActive && plan.type === desiredPlanType && remainingAmount > 0 && plan.totalAmount > 0;
};

export const getRemainingToFulfill = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>
): number => {
    const fulfilledAmount = new Decimal(planFulfillment[plan.id] || 0);

    return plan.type === PlanType.ONE_TIME
        ? Decimal.max(0, new Decimal(plan.totalAmount).minus(fulfilledAmount))
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            .toNumber()
        : new Decimal(plan.totalAmount).toNumber();
};

export const areAllAmountsZeros = (plans: DepositPlan[]): boolean => {
    return plans.every(plan => plan.allocations.every(a => a.amount === 0));
};