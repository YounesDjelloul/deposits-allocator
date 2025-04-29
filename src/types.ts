export interface Portfolio {
    id: string;
    name: string;
}

export enum PlanType {
    ONE_TIME = 'one-time',
    MONTHLY = 'monthly'
}

export interface AllocationItem {
    portfolioId: string;
    amount: number;
}

export interface DepositPlan {
    id: string;
    type: PlanType;
    allocations: AllocationItem[];
    isActive: boolean;
    totalAmount: number;
}

export interface Deposit {
    id: string;
    amount: number;
    referenceCode: string;
    timestamp: Date;
}

export interface PortfolioAllocation {
    portfolioId: string;
    amount: number;
}

export interface PlanSelectionResult {
    plan: DepositPlan;
    shouldDeactivate: boolean;
}