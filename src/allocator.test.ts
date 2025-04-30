import {describe, it, expect} from 'vitest';
import {Deposit, DepositPlan, PlanType, Portfolio, PortfolioAllocation} from "./types.ts";
import {allocateDeposits} from "./allocator.ts";


describe('Deposit Allocator', () => {
    it('should allocate funds when deposits amounts match plans', () => {
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

        const expectedResult: PortfolioAllocation[] = [
            {portfolioId: 'p1', amount: 10000},
            {portfolioId: 'p2', amount: 600}
        ];

        expect(result).toEqual(expectedResult);
    });

    it('should always prioritize one-time plans first', () => {
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
            {id: 'd1', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')}
        ];

        const result = allocateDeposits(portfolios, depositPlans, deposits);

        const expectedResult: PortfolioAllocation[] = [
            {portfolioId: 'p1', amount: 95.24},
            {portfolioId: 'p2', amount: 4.76}
        ];

        expect(result).toEqual(expectedResult);
    });

    it('should only deactivate the one-time plan if it is fully fulfilled', () => {
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
            {id: 'd1', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')},
            {id: 'd1', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')}
        ];

        const result = allocateDeposits(portfolios, depositPlans, deposits);

        const expectedResult: PortfolioAllocation[] = [
            {portfolioId: 'p1', amount: 190.48},
            {portfolioId: 'p2', amount: 9.52}
        ];

        expect(result).toEqual(expectedResult);
    });

    it('should deactivate the one-time plan even if it is fulfilled via multiple deposits', () => {
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
            {id: 'd1', amount: 5250, referenceCode: 'ref123', timestamp: new Date('2025-04-10')},
            {id: 'd1', amount: 5250, referenceCode: 'ref123', timestamp: new Date('2025-04-10')},
            {id: 'd1', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')}
        ];

        const result = allocateDeposits(portfolios, depositPlans, deposits);

        const expectedResult: PortfolioAllocation[] = [
            {portfolioId: 'p1', amount: 10000},
            {portfolioId: 'p2', amount: 600}
        ];

        expect(result).toEqual(expectedResult);
    });

    it('should distribute the remaining of the deposit if it exceeds the one-time plan total amount', () => {
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
            {id: 'd1', amount: 5250, referenceCode: 'ref123', timestamp: new Date('2025-04-10')},
            {id: 'd1', amount: 5350, referenceCode: 'ref123', timestamp: new Date('2025-04-10')},
            {id: 'd1', amount: 100, referenceCode: 'ref123', timestamp: new Date('2025-04-10')}
        ];

        const result = allocateDeposits(portfolios, depositPlans, deposits);

        const expectedResult: PortfolioAllocation[] = [
            {portfolioId: 'p1', amount: 10000},
            {portfolioId: 'p2', amount: 700}
        ];

        expect(result).toEqual(expectedResult);
    });
});