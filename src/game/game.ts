import { drawCardCount, displayWasteCardCount, stackCount, homeCount } from "../gameConfig";
import { CDRanks, CardData, CardState } from "./card";
import { CardList, GameState } from "./state";
import { createCardList, getShuffledIndexes } from "./utils";

import { ViewController } from "./view_controller";
import { Messages } from "../modules/modules_const";
import { DcTransitionItems } from "../logic_state_machine/state_interfaces";


export function Game()
{
    const view = ViewController();
    const cardsData: CardData[] = [];

    let gameState: GameState = {
        stockIDs: [],
        wasteIDs: [],
        stacksIDs: [],
        homesIDs: [],
        cards: []
    }
    let gameHistory: GameState[] = [];

    async function init() 
    {
        initCards();
        view.init(cardsData);
        newGame();
        gameHistory = [];
        waitForEvent();
    }

    function initCards()
    {
        const temp = createCardList();

        for(let i = 0; i < temp.length; i++)
        {
            const newCard = temp[i];

            cardsData.push(newCard);
        }
    }

    async function newGame()
    {
        gameState = {
            stockIDs: [],
            wasteIDs: [],
            stacksIDs: [],
            homesIDs: [],
            cards: []
        }
        gameHistory = [];

        for(let i = 0; i < stackCount; i++)
        {
            gameState.stacksIDs.push([]);
        }
        for(let i = 0; i < homeCount; i++)
        {
            gameState.homesIDs.push([]);
        }
        
        view.configure_times(0, 0);
        view.state_manager.configure_seq_list_items(DcTransitionItems.PARALLEL);

        newGameInitState();
    }

    async function newGameInitState()
    {
        for(let i = 0; i < cardsData.length; i++)
        {
            gameState.cards.push({ isOpen: false});
            gameState.stockIDs.push(i);
        }

        shuffleStock();
        
        await view.apply_state(gameState, true);

        view.state_manager.configure_seq_list_items(DcTransitionItems.PARALLEL);

        for(let i = 0; i < gameState.stacksIDs.length; i++)
        {
            for(let j = i; j < gameState.stacksIDs.length; j++)
            {
                transferCards(gameState.stockIDs[gameState.stockIDs.length - 1],
                    gameState.stockIDs, gameState.stacksIDs[j],
                    0.5, 0.2, false);

                await flow.delay(0.01);
                await view.apply_state(gameState, false);
            }
        }

        for(let i = 0; i < gameState.stacksIDs.length; i++)
        {
            await openLastCard(gameState.stacksIDs[i]);
        }
    }

    function saveHistory()
    {
        gameHistory.push(json.decode(json.encode(gameState)));
    }

    async function backHistory()
    {
        if(gameHistory.length == 0)
        {
            return;
        }

        gameState = gameHistory.pop()!;
        view.state_manager.configure_seq_item(DcTransitionItems.PARALLEL);
        view.configure_times(0.3, 0.2),
        await view.apply_state(gameState, true);
    }

    async function lastFromStockToWaste()
    {
        for(let i = 0; i < drawCardCount; i++)
        {
            if(gameState.stockIDs.length > 0)
            {
                transferCards(gameState.stockIDs[gameState.stockIDs.length - 1],
                    gameState.stockIDs, gameState.wasteIDs,
                    0.1, 0.2, false);
            }
            else
            {
                break;
            }
        }
        
        await openLastCardsWaste();
    }

    function checkStock(cardID : number)
    {
        return gameState.stockIDs.includes(cardID);
    }

    function checkWaste(cardID : number)
    {
        return gameState.wasteIDs.includes(cardID);
    }

    function checkHome(cardID : number)
    {
        for(let homeID = 0; homeID < gameState.homesIDs.length; homeID++)
        {
            if(gameState.homesIDs[homeID].includes(cardID))
            {
                return homeID;
            }
        }
        
        return -1;
    }

    function checkStack(cardID : number)
    {
        for(let stackID = 0; stackID < gameState.stacksIDs.length; stackID++)
        {
            if(gameState.stacksIDs[stackID].includes(cardID))
            {
                return stackID;
            }
        }

        return -1;
    }

    function getNextCardID(cardID: number, stackID: number)
    {
        const stack = gameState.stacksIDs[stackID];
        const cardIndex = stack.indexOf(cardID);

        if(cardIndex != -1)
        {
            if(cardIndex != stack.length - 1)
            {
                return stack[cardIndex + 1];
            }
            else
            {
                console.error('Карта последняя в стопке', cardID, stackID);
                
                return -1;
            }
        }
        else
        {
            console.error('Карта не найдена в стопке', cardID, stackID);

            return -1;
        }
    }

    interface CardPosition
    {
        position: number,
        id: number
    }

    function getCardPosition(cardID: number)
    {
        let cardPosition: CardPosition =
        {
            position: -1,
            id: -1
        }
        
        if(checkStock(cardID))
        {
            cardPosition.position = 0;
        }
        else if(checkWaste(cardID))
        {
            cardPosition.position = 1;
        }
        else
        {
            const stackID = checkStack(cardID);
            if(stackID > -1)
            {
                cardPosition.position = 2;
                cardPosition.id = stackID;
            }
            else
            {
                const homeID = checkHome(cardID);
                if(homeID > -1)
                {
                    cardPosition.position = 3;
                    cardPosition.id = homeID;
                }
                else
                {
                    console.error('Позиция карты не найдена', cardID);
                }
            }
        }

        return cardPosition;
    }

    function cardInDraggableStackOrder(cardID: number, stackID: number)
    {
        const stack = gameState.stacksIDs[stackID];

        //Если карта первая в стопке, то её точно можно перетаскивать
        if(stack.indexOf(cardID) == stack.length - 1)
        {
            return true;
        }
        
        const card = cardsData[cardID];
        const cardRank = CDRanks.indexOf(card.rank);

        const nextCardID = getNextCardID(cardID, stackID);
        const nextCard = cardsData[nextCardID];
        const nextCardRank = CDRanks.indexOf(nextCard.rank);

        //Если над картой лежит карта другого цвета
        if(checkCardSuitColor(cardID, nextCardID) == false
            //И предыдущего ранга, то перетаскиваемость зависит от следующей карты
            && nextCardRank == cardRank - 1)
        {
            //Проверяем перетаскиваемость следующей карты
            return cardInDraggableStackOrder(nextCardID, stackID);
        }
        else
        {
            return false;
        }
    }

    function cardIsDraggable(cardID: number)
    {
        const cardState = gameState.cards[cardID];

        //Если карта открыта
        if(cardState.isOpen == true)
        {
            const cardPosition = getCardPosition(cardID);

            //Если карта в сбросе
            if(cardPosition.position == 1)
            {
                //Если карта последняя в сбросе
                if(gameState.wasteIDs[gameState.wasteIDs.length - 1] == cardID)
                {
                    return true;
                }
            }
            //Если карта в стопке
            else if(cardPosition.position == 2)
            {
                return cardInDraggableStackOrder(cardID, cardPosition.id);
            }
        }
        else
        {
            return false;
        }
    }

    //true, если цвета совпадают, и false, если нет
    function checkCardSuitColor(firstCardID: number, secondCardID: number)
    {
        const firstCard = cardsData[firstCardID];
        const secondCard = cardsData[secondCardID];

        if(firstCard.suit == 'k' || firstCard.suit == 'p')
        {
            if(secondCard.suit == 'k' || secondCard.suit == 'p')
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        else if(firstCard.suit == 'c' || firstCard.suit == 'b')
        {
            if(secondCard.suit == 'c' || secondCard.suit == 'b')
            {
                return true;
            }
            else
            {
                return false;
            }
        }

        return false;
    }

    interface AvailablePile
    {
        available: boolean,
        id: number
    }

    function findAvailableStack(cardID: number, isDragging: boolean = false, stackID: number = -1)
    {
        let availableStack: AvailablePile =
        {
            available: false,
            id: -1
        }

        const card = cardsData[cardID];

        //Сначала проверяем другие непустые стопки, ища такую, где есть подходящая карта
        //другого цвета и предыдущего ранга
        for(let i = 0; i < gameState.stacksIDs.length; i++)
        {
            if(gameState.stacksIDs[i].length > 0)
            {
                const stack = gameState.stacksIDs[i];

                const lastCardID = stack[stack.length - 1];
                const lastCard = cardsData[lastCardID];

                if((CDRanks.indexOf(lastCard.rank) == CDRanks.indexOf(card.rank) + 1) == true
                && checkCardSuitColor(cardID, lastCardID) == false
                && (isDragging == false || (isDragging == true && stackID == i)))
                {
                    availableStack.available = true;
                    availableStack.id = i;

                    return availableStack;
                }
            }
        }

        //Если ранг карты - последний, король
        if(card.rank == 'k')
        {
            //Проверяем пустые стопки, подойдёт первая
            for(let i = 0; i < gameState.stacksIDs.length; i++)
            {
                if(gameState.stacksIDs[i].length == 0)
                {
                    if(isDragging == false || (isDragging == true && stackID == i))
                    {
                        availableStack.available = true;
                        availableStack.id = i;
    
                        return availableStack;
                    }
                }
            }
        }

        return availableStack;
    } 

    function findAvailableHome(cardID: number, isDragging: boolean = false, homeID: number = -1)
    {
        let availableHome: AvailablePile =
        {
            available: false,
            id: -1
        }

        const card = cardsData[cardID];

        //Сначала проверяем непустые дома, ища такой, где есть подходящая карта
        //той же масти и предыдущего ранга
        for(let i = 0; i < gameState.homesIDs.length; i++)
        {
            if(gameState.homesIDs[i].length > 0)
            {
                const home = gameState.homesIDs[i];

                const lastCardID = home[home.length - 1];
                const lastCard = cardsData[lastCardID];

                if((CDRanks.indexOf(lastCard.rank) == CDRanks.indexOf(card.rank) - 1) == true
                && lastCard.suit == card.suit
                && (isDragging == false || (isDragging == true && homeID == i)))
                {
                    availableHome.available = true;
                    availableHome.id = i;

                    return availableHome;
                }
            }
        }

        //Если ранг карты - первый, туз
        if(card.rank == 't')
        {
            //Ищем пустой дом, подойдёт первый
            for(let i = 0; i < gameState.homesIDs.length; i++)
            {
                if(gameState.homesIDs[i].length == 0)
                {
                    if(isDragging == false || (isDragging == true && homeID == i))
                    {
                        availableHome.available = true;
                        availableHome.id = i;

                        return availableHome;
                    }
                }
            }
        }

        return availableHome;
    }

    let helpArray: CardList = [];
    function clearHelpArray()
    {
        helpArray = [];
    }
    function addToHelpArray(helpCards: number[])
    {
        let cardID = -1;

        for(let i = 0; i < helpCards.length; i++)
        {
            const currentCardID = helpCards[i];

            if(helpArray.includes(currentCardID) == false)
            {
                cardID = currentCardID;

                break;
            }
        }
        
        if(cardID == -1)
        {
            helpArray = [];
            cardID = helpCards[0];
        }

        helpArray.push(cardID);

        return cardID;
    }

    function findHelp()
    {
        const helpCards = [];

        for(let i = 0; i < gameState.stacksIDs.length; i++)
        {
            const stack = gameState.stacksIDs[i];

            if(stack.length > 0)
            {
                for(let j = stack.length - 1; j >= 0; j--)
                {
                    const cardID = stack[j];
                    const card = cardsData[cardID];

                    if(cardIsDraggable(cardID))
                    {
                        const availableHomeData = findAvailableHome(cardID);
                        if(availableHomeData.available == true
                            && j == stack.length - 1)
                        {
                            helpCards.push(cardID);
                        }
                        else
                        {
                            const availableStackData = findAvailableStack(cardID);
                            if(availableStackData.available == true)
                            {
                                const availableStack = gameState.stacksIDs[availableStackData.id];

                                if(j > 0)
                                {
                                    const availableStack = gameState.stacksIDs[availableStackData.id];

                                    if(availableStack.length > 0)
                                    {
                                        const lastCard = cardsData[availableStack[availableStack.length - 1]];
                                        const prevCard = cardsData[stack[j - 1]];

                                        if(gameState.cards[stack[j - 1]].isOpen == true
                                            && CDRanks.indexOf(lastCard.rank) === CDRanks.indexOf(prevCard.rank))
                                        {
                                            console.log('Skip help: ' + availableStackData.id);
                                        }
                                        else
                                        {
                                            helpCards.push(cardID);
                                        }
                                    }
                                    else
                                    {
                                        helpCards.push(cardID);
                                    }
                                }
                                //Если целевая стопка пуста, карта лежит первой в исходной стопке
                                //и является королём, то перемещение её - пустое перекладывание
                                else if(availableStack.length == 0
                                    && j == 0
                                    && card.rank === 'k')
                                {
                                    console.log('Skip help: ' + availableStackData.id);
                                }
                                else
                                {
                                    helpCards.push(cardID);
                                }
                            }
                        }
                    }
                }
            }
        }

        if(gameState.wasteIDs.length > 0)
        {
            const waste = gameState.wasteIDs;

            const cardID = waste[waste.length - 1];

            if(cardIsDraggable(cardID))
            {
                const availableHomeData = findAvailableHome(cardID);
                if(availableHomeData.available == true)
                {
                    helpCards.push(cardID);
                }
                else
                {
                    const availableStackData = findAvailableStack(cardID);
                    if(availableStackData.available == true)
                    {
                        helpCards.push(cardID);
                    }
                }
            }
        }

        if(helpCards.length > 0)
        {
            return addToHelpArray(helpCards);
        }
        else 
        {
            clearHelpArray();

            return null;
        }
    }

    function checkVictory()
    {
        for(let i = 0; i < gameState.homesIDs.length; i++)
        {
            if(gameState.homesIDs[i].length == 13)
            {
                const home = gameState.homesIDs[i];

                for(let j = 0; j < home.length; j++)
                {
                    const cardID = home[j];
                    const card = cardsData[cardID];

                    if(CDRanks.indexOf(card.rank) != j)
                    {
                        return;
                    }
                }
            }
            else
            {
                return;
            }
        }

        return view.do_victory();
    }

    async function transferCards(cardID: number, fromPile: CardList, toPile: CardList, movingTime: number, openingTime: number, openLast: boolean = true) 
    {
        //Берём переносимые карты
        const transferredCards = fromPile.splice(fromPile.indexOf(cardID), fromPile.length);
        
        //Переносим их в целевой массив
        toPile.push(...transferredCards);
        
        view.configure_times(movingTime, openingTime);
        await view.apply_state(gameState, true);

        if(openLast == true)
        {
            await openLastCard(fromPile);
        }

        checkVictory();
    }

    // async function transferLastCard(fromPile: CardList, toPile: CardList, openLast: boolean = true) 
    // {
    //     const cardID = fromPile.pop()!;
    //     toPile.push(cardID);

    //     view.configure_times(0.1, 0.2);
    //     await view.apply_state(gameState, true);

    //     if(openLast == true)
    //     {
    //         await openLastCard(fromPile);
    //     }

    //     checkVictory();
    // }

    async function openLastCard(pile: CardList) 
    {
        if(pile.length > 0)
        {
            const lastCardID = pile[pile.length - 1];
            const lastCard = gameState.cards[lastCardID];

            if(lastCard.isOpen == false)
            {
                lastCard.isOpen = true;
            }
        }

        await view.apply_state(gameState, true);
    }

    async function openLastCardsWaste() 
    {
        if(gameState.wasteIDs.length > 0)
        {
            const lastIndex = Math.max(0, gameState.wasteIDs.length - displayWasteCardCount);
            
            for(let i = gameState.wasteIDs.length - 1; i >= 0; i--)
            {
                if(i >= lastIndex)
                {
                    if(gameState.cards[gameState.wasteIDs[i]].isOpen == false)
                    {
                        gameState.cards[gameState.wasteIDs[i]].isOpen = true;
                    }
                }
                else
                {
                    if(gameState.cards[gameState.wasteIDs[i]].isOpen == true)
                    {
                        gameState.cards[gameState.wasteIDs[i]].isOpen = false;
                    }
                }
            }
        }

        await view.apply_state(gameState, true);
    }

    async function shuffleStock() 
    {
        const cardIndexes = getShuffledIndexes(gameState.stockIDs.length);
        const tempArray: CardList = [];

        for(let i = 0; i < cardIndexes.length; i++)
        {
            const index = cardIndexes[i];

            tempArray.push(gameState.stockIDs[index]);
        }

        gameState.stockIDs = tempArray;
        await view.apply_state(gameState, true);
    }

    async function reshuffleWaste() 
    {
        if(gameState.wasteIDs.length > 0)
        {
            for(let i = 0; i < gameState.wasteIDs.length; i++)
            {
                gameState.cards[gameState.wasteIDs[i]].isOpen = false;
            }

            gameState.wasteIDs.reverse();

            transferCards(gameState.wasteIDs[0],
                gameState.wasteIDs, gameState.stockIDs, 
                0.1, 0.2, false);

            //shuffleStock();
        }
    }

    async function showHelp() 
    {
        flow._set_active(false);
        await view.show_help(findHelp());
        flow._set_active(true);
    }

    async function waitForEvent() 
    {
        while(true)
        {
            const [messageID, _message, sender] = await flow.until_any_message();
            view.do_message(messageID, _message, sender);

            if (messageID == 'BTN_BACK') 
            {
                log('BTN_BACK');

                await backHistory();
            }

            if (messageID == 'BTN_RESTART') 
            {
                log('BTN_RESTART');

                await newGame();
            }

            if (messageID == 'BTN_HELP') 
            {
                log('BTN_HELP');

                await showHelp();
            }

            if(messageID == 'CLICK_EMPTY_STOPKA')
            {
                saveHistory();

                await reshuffleWaste();
            }

            if(messageID == 'CLICK_CARD')
            {
                const message = _message as Messages['CLICK_CARD'];
                const cardID = message.id;
                log('CLICK_CARD');

                //Если карта находится в колоде
                if(checkStock(cardID) == true)
                {
                    //Если колода пуста, ничего не делаем
                    if(gameState.stockIDs.length > 0)
                    {
                        saveHistory();

                        //Переносим верхние карты в сброс
                        lastFromStockToWaste();
                    }
                }
                //Если карта находится в сбросе
                else if(checkWaste(cardID) == true)
                {
                    //Если карта доступна для перетаскивания
                    if(cardIsDraggable(cardID) == true)
                    {
                        //Поскольку в сбросе открыта только последняя карта, 
                        //она всегда может отправиться в дом

                        const availableHome = findAvailableHome(cardID);
                        if(availableHome.available == true)
                        {
                            saveHistory();

                            //Переносим карту в доступный дом
                            transferCards(cardID, 
                                gameState.wasteIDs, gameState.homesIDs[availableHome.id],
                                0.1, 0.2);
                            await openLastCardsWaste();
                        }
                        else
                        {
                            const availableStack = findAvailableStack(cardID);
                            if(availableStack.available == true)
                            {
                                saveHistory();

                                //Переносим карту в доступную стопку
                                transferCards(cardID, 
                                    gameState.wasteIDs, gameState.stacksIDs[availableStack.id],
                                    0.1, 0.2);
                                await openLastCardsWaste();
                            }
                        }
                    }
                }
                //Иначе проверяем стопки
                else
                {
                    const stackID = checkStack(cardID);
                    if(stackID > -1)
                    {
                        //Если карта доступна для перетаскивания
                        if(cardIsDraggable(cardID) == true)
                        {
                            const fromStack = gameState.stacksIDs[stackID];

                            //Поскольку в дом можно перемещать только по одной карте,
                            //нужно проверить, является ли карта последней в стопке
                            
                            //Если да, то в первую очередь проверяем доступные дома
                            if(fromStack[fromStack.length - 1] == cardID)
                            {
                                const availableHome = findAvailableHome(cardID);
                                if(availableHome.available == true)
                                {
                                    saveHistory();

                                    transferCards(cardID, 
                                        fromStack, gameState.homesIDs[availableHome.id],
                                        0.1, 0.2);
                                }
                                //Иначе проверяем стопки как обычно
                                else
                                {
                                    const availableStack = findAvailableStack(cardID);
                                    if(availableStack.available == true)
                                    {
                                        saveHistory();
        
                                        transferCards(cardID, 
                                            fromStack, gameState.stacksIDs[availableStack.id],
                                            0.1, 0.2);
                                    }
                                }
                            }
                            //Иначе карта и прочие карты, лежащие на ней, 
                            //могут попасть только в другую стопку
                            else
                            {
                                const availableStack = findAvailableStack(cardID);
                                if(availableStack.available == true)
                                {
                                    saveHistory();
        
                                    //Переносим карту в доступную стопку
                                    transferCards(cardID,
                                        fromStack, gameState.stacksIDs[availableStack.id],
                                        0.1, 0.2);
                                }
                            }
                        }
                    }
                }
            }

            if (messageID == 'DRAG_CARD') 
            {
                const message = _message as Messages['DRAG_CARD'];
                const cardID = message.id;
                log('DRAG_CARD');

                //Если карта доступна для перетаскивания
                if(cardIsDraggable(cardID) == true)
                {
                    let draggingCards: CardList = [];

                    //Если карта находится в сбросе
                    if(checkWaste(cardID) == true)
                    {
                        const waste = gameState.wasteIDs;

                        draggingCards = waste.slice(waste.indexOf(cardID), waste.length);
                    }
                    //Иначе проверяем стопки
                    else 
                    {
                        const stackID = checkStack(cardID);
                        if(stackID > -1)
                        {
                            const stack = gameState.stacksIDs[stackID];

                            draggingCards = stack.slice(stack.indexOf(cardID), stack.length);
                        }
                    }

                    view.start_drag(draggingCards);
                }
            }

            if (messageID == 'DROP_STACK') 
            {
                const message = _message as Messages['DROP_STACK'];
                const cardID = message.id_card;
                log('DROP_STACK');

                if(cardIsDraggable(cardID) == true)
                {
                    const cardPosition = getCardPosition(cardID);
    
                    if(cardPosition.position == 1)
                    {
                        //Поскольку в сбросе открыта только последняя карта, 
                        //она всегда может отправиться в дом
    
                        const availableHome = findAvailableHome(cardID, true, message.id_stack - stackCount);
                        if(availableHome.available == true)
                        {
                            saveHistory();
    
                            view.stop_drag();
    
                            //Переносим карту в доступный дом
                            transferCards(cardID, 
                                gameState.wasteIDs, gameState.homesIDs[availableHome.id],
                                0.1, 0.2);
                            await openLastCardsWaste();
                        }
                        else
                        {
                            const availableStack = findAvailableStack(cardID, true, message.id_stack);
                            if(availableStack.available == true)
                            {
                                saveHistory();
    
                                view.stop_drag();
    
                                //Переносим карту в доступную стопку
                                transferCards(cardID, 
                                    gameState.wasteIDs, gameState.stacksIDs[availableStack.id],
                                    0.1, 0.2);
                                await openLastCardsWaste();
                            }
                        }
                    }
                    else if(cardPosition.position == 2)
                    {
                        const fromStack = gameState.stacksIDs[cardPosition.id];
    
                        //Поскольку в дом можно перемещать только по одной карте,
                        //нужно проверить, является ли карта последней в стопке
                        
                        //Если да, то в первую очередь проверяем доступные дома
                        if(fromStack[fromStack.length - 1] == cardID)
                        {
                            const availableHome = findAvailableHome(cardID, true, message.id_stack - stackCount);
                            if(availableHome.available == true)
                            {
                                saveHistory();
    
                                view.stop_drag();
        
                                transferCards(cardID, 
                                    fromStack, gameState.homesIDs[availableHome.id],
                                    0.1, 0.2);
                            }
                            //Иначе проверяем стопки как обычно
                            else
                            {
                                const availableStack = findAvailableStack(cardID, true, message.id_stack);
                                if(availableStack.available == true)
                                {
                                    saveHistory();
    
                                    view.stop_drag();
        
                                    transferCards(cardID, 
                                        fromStack, gameState.stacksIDs[availableStack.id],
                                        0.1, 0.2);
                                }
                            }
                        }
                        //Иначе карта и прочие карты, лежащие на ней, 
                        //могут попасть только в другую стопку
                        else
                        {
                            const availableStack = findAvailableStack(cardID, true, message.id_stack);
                            if(availableStack.available == true)
                            {
                                saveHistory();
    
                                view.stop_drag();
        
                                //Переносим карту в доступную стопку
                                transferCards(cardID,
                                    fromStack, gameState.stacksIDs[availableStack.id],
                                    0.1, 0.2);
                            }
                        }
                    }
                }
    
                view.cancel_drag();
            }
        }
    }

    init();

    return{};
}