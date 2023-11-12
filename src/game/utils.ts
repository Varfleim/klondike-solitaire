import { CDSuits, CDRanks, CardData } from "./card";

export function createCardList()
{
    const cardsData: CardData[] = [];

    for(let s = 0; s < CDSuits.length; s++)
    {
        for(let r = 0; r < CDRanks.length; r++)
        {
            const newCard = {
                suit: CDSuits[s],
                rank: CDRanks[r]
            };

            cardsData.push(newCard);
        }
    }

    return cardsData;
}

export function getShuffledIndexes(count: number)
{
    const list: number[] = [];

    for(let i = 0; i < count; i++)
    {
        list.push(i);
    }

    for(let i = list.length - 1; i > 0; i--)
    {
        let j = Math.floor(Math.random() * (i + 1));

        [list[i], list[j]] = [list[j], list[i]];
    }

    return list;
}

export function isEqualPos(pos1: vector3, pos2: vector3, sigma: number = 0.001)
{
    return math.abs(pos1.x - pos2.x) < sigma 
    && math.abs(pos1.y - pos2.y) < sigma;
}