import {Deposit, DepositPlan, PlanFulfillment, PlanType, Portfolio, PortfolioAllocation} from "./model.ts";
import {areAllAmountsZeros, getRemainingToFulfill, isPlanEligible, isPlanFulfilled} from "./utils.ts";
import Decimal from "decimal.js";


const calculateProportionalDistribution = (
    allocations: PortfolioAllocation[],
    totalToDistribute: number
): PortfolioAllocation[] => {
    const total = allocations.reduce((sum, portfolioAllocation) => sum + portfolioAllocation.amount, 0);

    if (total === 0) return [];

    return allocations.map(allocation => {
        const share = new Decimal(allocation.amount).div(total);
        const amount = share.mul(totalToDistribute).toDecimalPlaces(2).toNumber();

        return {
            portfolioId: allocation.portfolioId,
            amount
        };
    });
};

const calculateOneTimePlanAllocation = (
    plan: DepositPlan,
    depositAmount: number,
    currentAllocations: PortfolioAllocation[],
    planFulfillment: PlanFulfillment
): {
    newAllocations: PortfolioAllocation[];
    newPlanFulfillment: PlanFulfillment;
    remainingAmount: number;
    planDeactivated: boolean;
} => {
    const remainingToFulfill = new Decimal(getRemainingToFulfill(plan, planFulfillment));
    const depositDecimal = new Decimal(depositAmount);

    const amountToApply = Decimal.min(depositDecimal, remainingToFulfill);
    const ratio = amountToApply.div(plan.totalAmount);

    const planAllocationsMap = new Map(
        plan.allocations.map(a => [a.portfolioId, a])
    );

    const newAllocations = currentAllocations.map(current => {
        const planAllocation = planAllocationsMap.get(current.portfolioId);

        if (!planAllocation) return current;

        const allocationAmount = new Decimal(planAllocation.amount);
        const amountToAdd = ratio.equals(1)
            ? allocationAmount
            : allocationAmount.mul(ratio).toDecimalPlaces(2);

        return {
            portfolioId: current.portfolioId,
            amount: new Decimal(current.amount)
                .plus(amountToAdd)
                .toDecimalPlaces(2)
                .toNumber()
        };
    });

    const newPlanFulfillment = {...planFulfillment};
    newPlanFulfillment[plan.id] = new Decimal(planFulfillment[plan.id] || 0)
        .plus(amountToApply)
        .toNumber();

    const planDeactivated = isPlanFulfilled(plan, newPlanFulfillment);

    const remainingAmount = depositDecimal.minus(amountToApply).toNumber();

    return {
        newAllocations,
        newPlanFulfillment,
        remainingAmount,
        planDeactivated
    };
};

export const calculateMonthlyPlanAllocation = (
    plan: DepositPlan,
    depositAmount: number,
    currentAllocations: PortfolioAllocation[]
): PortfolioAllocation[] => {
    const proportionalDistribution = calculateProportionalDistribution(
        plan.allocations,
        depositAmount
    );

    const distributionMap = new Map(
        proportionalDistribution.map(d => [d.portfolioId, d.amount])
    );

    return currentAllocations.map(current => {
        const additionalAmount = distributionMap.get(current.portfolioId) || 0;

        return {
            portfolioId: current.portfolioId,
            amount: new Decimal(current.amount)
                .plus(additionalAmount)
                .toDecimalPlaces(2)
                .toNumber()
        };
    });
};

export const calculateEqualDistribution = (
    portfolios: Portfolio[],
    totalAmount: number
): PortfolioAllocation[] => {
    const share = new Decimal(totalAmount).div(portfolios.length).toNumber();

    return portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: share
    }));
};

export const calculateAllocations = (
    portfolios: Portfolio[],
    depositPlans: DepositPlan[],
    deposits: Deposit[]
): PortfolioAllocation[] => {
    if (areAllAmountsZeros(depositPlans)) {
        const totalAmount = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
        return calculateEqualDistribution(portfolios, totalAmount);
    }

    let allocations: PortfolioAllocation[] = portfolios.map(portfolio => ({
        portfolioId: portfolio.id,
        amount: 0
    }));

    const workingPlans = depositPlans.map(plan => ({...plan}));

    const oneTimePlan = workingPlans.find(p => p.type === PlanType.ONE_TIME && p.isActive);
    const monthlyPlan = workingPlans.find(p => p.type === PlanType.MONTHLY && p.isActive);

    let planFulfillment: PlanFulfillment = {};

    deposits.forEach(deposit => {
        let remaining = deposit.amount;
        let currentOneTimePlan = oneTimePlan ? {...oneTimePlan, isActive: true} : undefined;

        // Priority 1: ONE-TIME Deposit
        if (currentOneTimePlan && currentOneTimePlan.isActive && isPlanEligible(currentOneTimePlan, remaining, PlanType.ONE_TIME)) {
            const {
                newAllocations,
                newPlanFulfillment,
                remainingAmount,
                planDeactivated
            } = calculateOneTimePlanAllocation(currentOneTimePlan, remaining, allocations, planFulfillment);

            allocations = newAllocations;
            planFulfillment = newPlanFulfillment;
            remaining = remainingAmount;

            if (planDeactivated) {
                currentOneTimePlan.isActive = false;
            }
        }

        // Priority 2: Monthly Deposit
        if (monthlyPlan && remaining > 0 && isPlanEligible(monthlyPlan, remaining, PlanType.MONTHLY)) {
            allocations = calculateMonthlyPlanAllocation(monthlyPlan, remaining, allocations);
            remaining = 0;
        }

        // Priority 3: Any Leftovers
        if (!monthlyPlan && currentOneTimePlan && remaining > 0) {
            const proportionalDistribution = calculateProportionalDistribution(
                currentOneTimePlan.allocations,
                remaining
            );

            allocations = allocations.map(allocation => {
                const planAllocation = proportionalDistribution.find(
                    pa => pa.portfolioId === allocation.portfolioId
                );

                if (!planAllocation) return allocation;

                return {
                    portfolioId: allocation.portfolioId,
                    amount: new Decimal(allocation.amount)
                        .plus(planAllocation.amount)
                        .toDecimalPlaces(2)
                        .toNumber()
                };
            });
        }
    });

    return allocations;
};