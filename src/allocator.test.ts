import {describe, it, expect} from 'vitest';
import {Deposit, DepositPlan, PlanType, Portfolio} from "./types.ts";
import {allocateDeposits} from "./allocator.ts";


describe('Deposit Allocator', () => {
    it('should allocate funds according when deposits amounts match plans', () => {
        const portfolios: Portfolio[] = [
            {id: 'p1', name: 'High risk'},
            {id: 'p2', name: 'Retirement'}
        ];

        const depositPlans: DepositPlan[] = [
            {
                id: 'dp1',
                type: PlanType.ONE_TIME,
                allocations: [
                    {portfolioId: 'p1', amount: 10000},
                    {portfolioId: 'p2', amount: 500}
                ],
                isActive: true,
                totalAmount: 10500
            },
            {
                id: 'dp2',
                type: PlanType.MONTHLY,
                allocations: [
                    {portfolioId: 'p1', amount: 0},
                    {portfolioId: 'p2', amount: 100}
                ],
                isActive: true,
                totalAmount: 100
            }
        ];

        const deposits: Deposit[] = [
            {id: 'd1', amount: 10500, referenceCode: 'ref123', timestamp: new Date('2025-04-01')},
            {id: 'd2', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')}
        ];

        const result = allocateDeposits(portfolios, depositPlans, deposits);

        expect(result).toEqual([
            {portfolioId: 'p1', amount: 10000},
            {portfolioId: 'p2', amount: 600}
        ]);
    });
});