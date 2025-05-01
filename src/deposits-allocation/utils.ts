import {DepositPlan, PlanType} from "./types.ts";

export const isPlanFulfilled = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>,
): boolean => {
    return planFulfillment[plan.id] >= plan.totalAmount;
};

export const isPlanEligible = (plan: DepositPlan, remainingAmount: number, desiredPlanType: PlanType): boolean => {
    return plan.isActive && plan.type === desiredPlanType && remainingAmount > 0
};

export const getRemainingToFulfill = (
    plan: DepositPlan,
    planFulfillment: Record<string, number>
): number => {
    const fulfilledAmount = planFulfillment[plan.id] || 0;

    return plan.type === PlanType.ONE_TIME
        ? Math.max(0, plan.totalAmount - fulfilledAmount)
        : plan.totalAmount;
};