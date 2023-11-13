import { CardState } from "./card";

export type CardList = number[];

export interface GameState
{
    stockIDs: CardList;
    wasteIDs: CardList;
    stacksIDs: CardList[];
    homesIDs: CardList[];
    cards: CardState[];
}

export enum DcCardStates {
    NONE,
    OPENED,
    STOPKA,
    WASTE,
    HOME_1, HOME_2, HOME_3, HOME_4,
    STACK_1, STACK_2, STACK_3, STACK_4, STACK_5, STACK_6, STACK_7, //STACK_8, STACK_9, STACK_10,
}

export enum DcTransitionStates {
    RENDER_ORDER,
    POSITION,
    OPENED
}
