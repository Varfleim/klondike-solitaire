export const drawCardCount = 3;
export const displayWasteCardCount = 3;
export const stackCount = 7;
export const homeCount = 4;
export const helpMoveCount = 10;

interface VoidData { }
interface IdData { id: number }

// пользовательские сообщения под конкретный проект, доступны типы через глобальную тип-переменную UserMessages
export type _UserMessages = {
    BTN_BACK: VoidData
    BTN_HELP: VoidData
    BTN_RESTART: VoidData
    CLICK_CARD: IdData
    DRAG_CARD: IdData
    DROP_STACK: { id_stack: number, id_card: number }
    CLICK_EMPTY_STOPKA: VoidData
};