export type TCardSuit = 'k' | 'b' | 'c' | 'p';
export type TCardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'v' | 'd' | 'k' | 't';

export const CDSuits: TCardSuit[] = ['k', 'b', 'c', 'p'];
export const CDRanks: TCardRank[] = ['t', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'v', 'd', 'k'];

export interface CardState
{
    isOpen: boolean;
}

export interface CardData
{
    suit: TCardSuit;
    rank: TCardRank;
}

export function Card(state: CardState)
{
    const _state = state;

    return { _state };
}