import { is_flag, set_flag } from "../logic_state_machine/state_helper";
import { StateManager } from "../logic_state_machine/state_manager";
import { CardData } from "./card";
import { DcCardStates, DcTransitionStates, GameState, } from "./state";
import { StateItemInfo, TransitionList } from "../logic_state_machine/state_interfaces";
import { isEqualPos } from "./utils";
import { GoManager } from "../modules/GoManager";
import { IGameItem, Messages } from "../modules/modules_const";
import { helpMoveCount } from "../gameConfig";

interface ClickCardInfo extends IGameItem {
    id_stack?: number;
    id_card?: number;
}

export function ViewController() {
    const gm = GoManager();
    const state_manager = StateManager(get_transition_set);
    let time_opening = 0.1;
    let time_moving = 0.1;
    const card_width = 195;
    const card_height = 289;
    const card_offset_x = 10;
    let size_card = 1;
    let dc_card_list: CardData[];
    const go_cards: hash[] = []; // все карты
    const go_stacks: hash[] = [];
    const go_stacks_zones: hash[] = [];
    const go_homes: hash[] = [];
    const go_homes_zones: hash[] = [];
    let go_stopka: hash;
    let go_stopka_zone: hash;
    let go_waste: hash;
    let current_rub = 'r1';
    let last_state: GameState;

    function init(_dc_card_list: CardData[]) {
        dc_card_list = _dc_card_list;
        init_ui();
        update_ui();
    }

    function get_card_size() {
        const sx = size_card / card_width;
        const new_width = card_width * sx;
        const new_height = card_height * sx;
        return [new_width, new_height, sx];
    }

    function update_size() {
        size_card = Camera.get_ltrb_bounds()[2] / 12 - card_offset_x;
    }

    function init_ui() {
        update_size();
        const pos = vmath.vector3(0, 0, 0);
        // 13 блоков: 1-7 стопки, 8-11 дома, 12 - колода, 13 - сброс
        for(let i = 1; i <= 13; i++)
        {
            const g = gm.make_go('card', pos);
            if(i >= 1 && i <= 7)
            {
                go_stacks.push(g);
                const g2 = gm.make_go('card', pos);
                gm.set_color_hash(g2, '#000', 0.1);
                go_stacks_zones.push(g2);
                gm.add_game_item<ClickCardInfo>({ _hash: g2, is_clickable: true, id_stack: i - 1 });
            }
            else if(i >= 8 && i <= 11)
            {
                go_homes.push(g);
                const g2 = gm.make_go('card', pos);
                gm.set_color_hash(g2, '#000', 0.1);
                go_homes_zones.push(g2);
                gm.add_game_item<ClickCardInfo>({ _hash: g2, is_clickable: true, id_stack: i - 1 });
            }
            else if(i == 12)
            {
                go_stopka = g;
                const g2 = gm.make_go('card', pos);
                gm.set_color_hash(g2, '#000', 0.1);
                go_stopka_zone = g2;
                gm.add_game_item<ClickCardInfo>({ _hash: g2, is_clickable: true, id_stack: i - 1 });
            }
            else
            {
                go_waste = g;
            }
        }
        
        // создаем все карты
        for (let id = 0; id < dc_card_list.length; id++) {
            //const cd = dc_card_list[id];
            pos.x += 20;
            const _go = gm.make_go('card', pos);
            gm.add_game_item<ClickCardInfo>({ _hash: _go, is_clickable: true, id_card: id });
            gm.set_sprite_hash(_go, current_rub);
            go_cards.push(_go);
        }
        state_manager.set_go_list(go_cards);
        state_manager.transition_manager.set_order_trasitions([DcTransitionStates.RENDER_ORDER, DcTransitionStates.POSITION, DcTransitionStates.OPENED]);
    }

    function update_ui() {
        update_size();
        const pos = vmath.vector3(0, 0, 0);
        const [new_width, new_height, size_x] = get_card_size();
        const scale = vmath.vector3(size_x, size_x, 1);
        pos.y = -new_height / 2 - 40;
        const first_offset = (new_width + card_offset_x) * 0.5;

        for (let x = 0; x < go_stacks.length; x++) {
            pos.x = (size_card + card_offset_x) * x + first_offset;
            const g = go_stacks[x];
            const g_zone = go_stacks_zones[x];
            go.set_scale(scale, g);
            go.set_position(pos, g);
            gm.set_color_hash(g, '#000', 0.3);
            // зона отпускания для стеков
            let tmp_scale = scale.y;
            scale.y = 3;
            go.set_scale(scale, g_zone);
            scale.y = tmp_scale;
            gm.set_position_xy_hash(g_zone, pos.x, pos.y + new_height / 2, 0.5, 1);
        }
        
        //Дома
        for(let x = 0; x < go_homes.length; x++)
        {
            pos.x = (size_card + card_offset_x) * (1 + go_stacks.length) 
            + (size_card + card_offset_x) * x
            + first_offset;
            const g = go_homes[x];
            const g_zone = go_homes_zones[x];
            go.set_scale(scale, g);
            go.set_position(pos, g);
            gm.set_color_hash(g, '#000', 0.3);

            go.set_scale(scale, g_zone);
            gm.set_position_xy_hash(g_zone, pos.x, pos.y, 0.5, 0.5);
        }

        //Стопка
        pos.y -= new_height + 20;
        pos.x = (size_card + card_offset_x) * (1 + go_stacks.length) + first_offset;
        go.set_scale(scale, go_stopka);
        go.set_position(pos, go_stopka);
        gm.set_color_hash(go_stopka, '#000', 0.3);
        go.set_scale(scale, go_stopka_zone);
        gm.set_position_xy_hash(go_stopka_zone, pos.x, pos.y, 0.5, 0.5);

        //Сброс
        pos.x = (size_card + card_offset_x) * (2 + go_stacks.length) + first_offset;
        go.set_scale(scale, go_waste);
        go.set_position(pos, go_waste);
        gm.set_color_hash(go_waste, '#000', 0.3);
        
        for (let i = 0; i < go_cards.length; i++) {
            const card = go_cards[i];
            go.set_scale(scale, card);
        }
    }

    function start_drag(list: number[]) {
        const tmp: hash[] = [];
        for (let i = 0; i < list.length; i++) {
            const id_card = list[i];
            tmp.push(go_cards[id_card]);
        }
        gm.start_dragging_list(tmp, 20);
    }

    function cancel_drag() {
        gm.reset_dragging_list(0.1);
    }

    function stop_drag() {
        gm.stop_all_dragging();
    }

    function is_animations_done() {
        return state_manager.transition_manager.is_all_processed();
    }

    async function wait_animations() {
        while (true) {
            if (is_animations_done()) {
                flow._set_active(true);
                break;
            }
            await flow.delay(0.001);
        }
    }

    function configure_times(t_moving: number, t_opening: number) {
        time_moving = t_moving;
        time_opening = t_opening;
    }

    async function apply_state(game_state: GameState, wait_applying = false) {
        last_state = game_state;
        flow._set_active(false);
        update_states(game_state);
        state_manager.apply_state();
        if (wait_applying) {
            await wait_animations();
        }
    }

    function update_states(game_state: GameState) {
        // stopka
        let cnt = 0;
        let id_stopka = 0;
        for (let i = 0; i < game_state.stockIDs.length; i++) {
            cnt++;
            if (cnt > 10 && game_state.stockIDs.length <= 50) {
                id_stopka++;
                cnt = 1;
            }
            const id = game_state.stockIDs[i];
            let mask = 0;
            mask = set_flag(mask, DcCardStates.STOPKA, true);
            mask = set_flag(mask, DcCardStates.OPENED, game_state.cards[id].isOpen);
            state_manager.update_states(id, mask, 0);
        }
        // waste
        for(let i = 0; i < game_state.wasteIDs.length; i++)
        {
            const id = game_state.wasteIDs[i];
            let mask = 0;
            mask = set_flag(mask, DcCardStates.WASTE, true);
            mask = set_flag(mask, DcCardStates.OPENED, game_state.cards[id].isOpen);
            state_manager.update_states(id, mask, i);
        }
        // stacks
        for (let s = 0; s < game_state.stacksIDs.length; s++) {
            const stack_cards = game_state.stacksIDs[s];
            for (let i = 0; i < stack_cards.length; i++) {
                const id = stack_cards[i];
                let mask = 0;
                mask = set_flag(mask, DcCardStates.STACK_1 + s, true);
                mask = set_flag(mask, DcCardStates.OPENED, game_state.cards[id].isOpen);
                state_manager.update_states(id, mask, i);
            }
        }
        // homes
        for(let h = 0; h < game_state.homesIDs.length; h++)
        {
            const home_cards = game_state.homesIDs[h];

            for(let i = 0; i < home_cards.length; i++)
            {
                const id = home_cards[i];
                let mask = 0;
                mask = set_flag(mask, DcCardStates.HOME_1 + h, true);
                mask = set_flag(mask, DcCardStates.OPENED, game_state.cards[id].isOpen);
                state_manager.update_states(id, mask, i);
            }
        }
    }

    function get_transition_set(state_info: StateItemInfo) {
        const ts: TransitionList = [];
        const offset_card = 25;
        const state = state_info.state;
        const to_pos = vmath.vector3();
        let z_index = state.index;
        // колода
        if (is_flag(state.mask, DcCardStates.STOPKA)) 
        {
            const tmp = go.get_position(go_stopka);
            to_pos.x = tmp.x;
            to_pos.y = tmp.y;
        }
        // сброс
        else if(is_flag(state.mask, DcCardStates.WASTE))
        {
            const tmp = go.get_position(go_waste);
            to_pos.x = tmp.x;
            to_pos.y = tmp.y;
        }
        else {
            // стопки
            let is_stack = false;
            for (let i = 0; i < go_stacks.length; i++) {
                if (is_flag(state.mask, DcCardStates.STACK_1 + i)) {
                    const tmp = go.get_position(go_stacks[i]);
                    to_pos.x = tmp.x;
                    to_pos.y = tmp.y;
                    is_stack = true;
                    break;
                }
            }

            if (is_stack) {
                to_pos.y -= offset_card * state.index;
            }
            else {
                // дома
                for(let i = 0; i < go_homes.length; i++)
                {
                    if(is_flag(state.mask, DcCardStates.HOME_1 + i))
                    {
                        const tmp = go.get_position(go_homes[i]);
                        to_pos.x = tmp.x;
                        to_pos.y = tmp.y;
                        break;
                    }
                }
            }
        }

        ts.push([
            DcTransitionStates.RENDER_ORDER, (_go, cb_end) => {
                gm.set_render_order_hash(_go, z_index);
                cb_end();
            }
        ]);

        let time1 = time_opening * 0.5;
        ts.push([
            DcTransitionStates.OPENED, (_go, cb_end) => {
                const cd = dc_card_list[state_info.id_item];
                const cur_anim = gm.get_sprite_hash(_go);
                const to_name = is_flag(state.mask, DcCardStates.OPENED) ? (cd.suit + cd.rank) : current_rub;
                if (to_name == cur_anim) {
                    cb_end();
                    return;
                }
                const scale = go.get_scale(_go);
                gm.do_scale_anim_hash(_go, vmath.vector3(0.001, scale.y, 1), time1, 0, () => {
                    gm.set_sprite_hash(_go, to_name);
                    gm.do_scale_anim_hash(_go, scale, time1, 0, () => cb_end());
                });
            }
        ]);

        let time2 = time_moving;
        ts.push([
            DcTransitionStates.POSITION, (_go, cb_end) => {
                const cur_pos = go.get_position(_go);
                if (isEqualPos(cur_pos, to_pos)) {
                    cb_end();
                    return;
                }
                gm.move_to_with_time_hash(_go, to_pos, time2, 0, () => cb_end());
            }
        ]);
        return ts;
    }

    async function update_resize() {
        update_ui();
        state_manager.set_force_apply(true);
        update_states(last_state);
        state_manager.apply_state();
        state_manager.set_force_apply(false);
        await wait_animations();
    }

    let is_down = false;
    let up_info: hash[] = [];
    let drag_card = -1;
    async function do_message(message_id: string, _message: AnyTable, sender: any) {
        gm.do_message(message_id, _message, sender);

        // обработка изменения размера окна
        if (message_id == 'MSG_ON_RESIZE') {
            await update_resize();
        }

        // ловим нажатие на карту чтобы потом при отпускании зафиксить на какую стопку мы ее перенесли
        else if (message_id == ID_MESSAGES.MSG_ON_DOWN_ITEM) {
            const message = _message as Messages['MSG_ON_DOWN_ITEM'];
            const item = message.item as ClickCardInfo;
            drag_card = -1;
            if (item.id_card !== undefined) {
                is_down = true;
                up_info = [];
                drag_card = item.id_card;
            }
        }

        // кликнули куда-то без смещения
        else if (message_id == ID_MESSAGES.MSG_ON_CLICK_ITEM) {
            const item = _message.item as ClickCardInfo;
            if (item.id_card !== undefined) {
                is_down = true;
                up_info = [];
                Manager.send_game('CLICK_CARD', { id: item.id_card });
            }

            if(item.id_stack == 11)
            {
                is_down = true;
                up_info = [];
                Manager.send_game('CLICK_EMPTY_STOPKA', {id: item.id_stack})
            }
        }

        // начали тянуть карту
        else if (message_id == ID_MESSAGES.MSG_ON_START_DRAG_ITEM) {
            const item = _message.item as ClickCardInfo;
            if (item.id_card !== undefined) {
                Manager.send_game('DRAG_CARD', { id: item.id_card });
            }
        }

        // отпустили нажатие в зоне любого хеша
        else if (message_id == ID_MESSAGES.MSG_ON_UP_HASHES) {
            const message = _message as Messages['MSG_ON_UP_HASHES'];
            up_info = message.hashes;
        }

        // отпустили нажатие
        else if (message_id == ID_MESSAGES.MSG_ON_UP) {
            if (!is_down)
                return;
            is_down = false;
            let id = -1;
            if (up_info.length > 0) {
                for (let i = 0; i < up_info.length; i++) {
                    const it = up_info[i];
                    const g = gm.get_item_by_go(it) as ClickCardInfo;
                    if (g.id_stack != undefined) {
                        id = g.id_stack;
                    }
                }
            }
            up_info = [];
            Manager.send_game('DROP_STACK', { id_card: drag_card, id_stack: id });
        }

    }

    async function move_help(moveNumber: number, movingGo: HTMLDivElement, cardPos: vector3) 
    {
        const pos1 = vmath.vector3(cardPos.x + card_offset_x, cardPos.y, 0);
        const pos2 = vmath.vector3(cardPos.x - card_offset_x, cardPos.y, 0);

        gm.move_to_with_time_hash(movingGo, moveNumber % 2 == 1 ? pos1 : pos2, 0.1);
    }

    async function show_help(helpCardID: number | null) 
    {
        const state = last_state;

        if(helpCardID == null)
        {
            const stopka = state.stockIDs;

            if(stopka.length > 0)
            {
                for(let i = 0; i < helpMoveCount; i++)
                {
                    for(let j = 0; j < stopka.length; j++)
                    {
                        const id_card = stopka[j];
                        const card_position = go.get_position(go_cards[id_card]);
    
                        await move_help(i, go_cards[id_card], card_position);
                    }
                    await flow.delay(0.15);
                }
                return;
            }
            else
            {
                for(let i = 0; i < helpMoveCount; i++)
                {
                    await move_help(i, go_stopka, go.get_position(go_stopka));
                    await move_help(i, go_stopka_zone, go.get_position(go_stopka_zone));
                    await flow.delay(0.15);
                }
            }
            return;
        }

        for(let i = 0; i < state.stacksIDs.length; i++)
        {
            if(state.stacksIDs[i].includes(helpCardID))
            {
                const stack = state.stacksIDs[i];
                const first_help_card_index = stack.indexOf(helpCardID);
                const sliced_help_cards = stack.slice(first_help_card_index, stack.length);
                const card_positions = [];

                for(let j = 0; j < sliced_help_cards.length; j++)
                {
                    const id_card = sliced_help_cards[j];
                    card_positions.push(go.get_position(go_cards[id_card]));
                }

                for(let j = 0; j < helpMoveCount; j++)
                {
                    for(let k = 0; k < sliced_help_cards.length; k++)
                    {
                        const id_card = sliced_help_cards[k];
                        
                        await move_help(j, go_cards[id_card], card_positions[k]);
                    }
                    await flow.delay(0.15);
                }

                for(let j = 0; j < sliced_help_cards.length; j++)
                {
                    const id_card = sliced_help_cards[j];

                    gm.move_to_with_time_hash(go_cards[id_card], card_positions[j], 0.1);
                }
                return;
            }
        }
        
        if(state.wasteIDs.includes(helpCardID))
        {
            const waste = state.wasteIDs;
            const first_help_card_index = waste.indexOf(helpCardID);
            const sliced_help_cards = waste.slice(first_help_card_index, waste.length);
            const card_positions = [];

            for(let i = 0; i < sliced_help_cards.length; i++)
            {
                const id_card = sliced_help_cards[i];
                card_positions.push(go.get_position(go_cards[id_card]));
            }

            for(let i = 0; i < helpMoveCount; i++)
            {
                for(let j = 0; j < sliced_help_cards.length; j++)
                {
                    const id_card = sliced_help_cards[j];
                    
                    await move_help(i, go_cards[id_card], card_positions[j]);
                }
                await flow.delay(0.15);
            }

            for(let i = 0; i < sliced_help_cards.length; i++)
            {
                const id_card = sliced_help_cards[i];

                gm.move_to_with_time_hash(go_cards[id_card], card_positions[i], 0.1);
            }
            return;
        }
    }

    function do_victory()
    {
        const [start_width, start_height, inner_width, inner_height] = Camera.get_ltrb_bounds();

        for(let i = 0; i < go_cards.length; i++)
        {
            const card_go = go_cards[i];
            const rand_1 = math.random(-300, 550);
            const rand_2 = -math.random(math.abs(inner_width) + 300, math.abs(inner_width) + 900);
            const delay = i * 0.01;

            gm.move_to_with_time_hash(card_go, vmath.vector3(rand_1, rand_2, 0), 2, delay);
            gm.rotate_to_with_time_hash(card_go, 3600, 2, delay);
        }
    }

    return { init, do_message, apply_state, configure_times, wait_animations, state_manager, start_drag, stop_drag, cancel_drag, show_help, do_victory, };
}