import { GameSystemInfo } from 'bcdice/lib/bcdice/game_system_list.json';
import GameSystemClass from 'bcdice/lib/game_system';

import BCDiceLoader from './bcdice/bcdice-loader';
import { ChatMessage, ChatMessageContext } from './chat-message';
import { ChatTab } from './chat-tab';
import { SyncObject } from './core/synchronize-object/decorator';
import { GameObject } from './core/synchronize-object/game-object';
import { ObjectStore } from './core/synchronize-object/object-store';
import { EventSystem } from './core/system';
import { PromiseQueue } from './core/system/util/promise-queue';
import { StringUtil } from './core/system/util/string-util';

interface DiceRollResult {
  id: string;
  result: string;
  isSecret: boolean;
  isSuccess?: boolean;
  isFailure?: boolean;
  isCritical?: boolean;
  isFumble?: boolean;
}

interface ChatCommandResult {
  id: string;
  arg: string;
  command: string;
  result: string;
  isSecret: boolean;
}

@SyncObject('dice-bot')
export class DiceBot extends GameObject {
  private static loader: BCDiceLoader;
  private static queue: PromiseQueue = DiceBot.initializeDiceBotQueue();

  static diceBotInfos: GameSystemInfo[] = [];

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    EventSystem.register(this)
      .on('SEND_MESSAGE', async event => {
        let chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) return;

        let text: string = StringUtil.toHalfWidth(chatMessage.text).trim();
        let gameType: string = chatMessage.tag;

        if (text.startsWith('/')) {
          const [_, command, arg] = /^\/(\w+)\s*(.*)/i.exec(text) || [];
          if (command) {
            const commandResult = await DiceBot.chatCommandAsync(command, arg, gameType);
            if (commandResult.result) {
              this.sendChatCommandResultMessage(commandResult, chatMessage);
            }
          }
        }

        let regArray = /^((\d+)?\s+)?(.*)?/ig.exec(text);
        let repeat: number = (regArray[2] != null) ? Number(regArray[2]) : 1;
        let rollText: string = (regArray[3] != null) ? regArray[3] : text;
        if (!rollText || repeat < 1) return;
        // 繰り返しコマンドに変換
        if (repeat > 1) {
          rollText = `x${repeat} ${rollText}`
        }

        let rollResult = await DiceBot.diceRollAsync(rollText, gameType);
        if (!rollResult.result) return;
        console.log(rollResult)
        this.sendResultMessage(rollResult, chatMessage);
        return;
      });
  }

  // GameObject Lifecycle
  onStoreRemoved() {
    super.onStoreRemoved();
    EventSystem.unregister(this);
  }

  private sendResultMessage(rollResult: DiceRollResult, originalMessage: ChatMessage) {
    let id: string = rollResult.id.split(':')[0];
    let result: string = rollResult.result;
    let isSecret: boolean = rollResult.isSecret;
    const isSuccess: boolean = rollResult.isSuccess;
    const isFailure: boolean = rollResult.isFailure;
    const isCritical: boolean = rollResult.isCritical;
    const isFumble: boolean = rollResult.isFumble;

    if (result.length < 1) return;

    let tag = 'system';
    if (isSuccess) tag += ' success';
    if (isFailure) tag += ' failure';
    if (isCritical) tag += ' critical';
    if (isFumble) tag += ' fumble';

    let diceBotMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'System-BCDice',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: 'dice',
      tag: `${isSecret ? ' secret ' : ''}${tag}`,
      name: `${id} : ${originalMessage.name}${isSecret ? ' (Secret)' : ''}`,
      text: `${result}`,
      color: originalMessage.color,
    };

    if (originalMessage.to != null && 0 < originalMessage.to.length) {
      diceBotMessage.to = originalMessage.to;
      if (originalMessage.to.indexOf(originalMessage.from) < 0) {
        diceBotMessage.to += ' ' + originalMessage.from;
      }
    }
    let chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) chatTab.addMessage(diceBotMessage);
  }

  private sendChatCommandResultMessage(chatCommandResult: ChatCommandResult, originalMessage: ChatMessage) {
    let id: string = chatCommandResult.id;
    let result: string = chatCommandResult.result;
    let isSecret: boolean = chatCommandResult.isSecret;

    if (result.length < 1) return;

    let diceBotMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'ChatCommand',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: '',
      tag: `system chatCommand`,
      name: `ChatCommand : ${originalMessage.name}${isSecret ? ' (Secret)' : ''}`,
      text: result
    };

    if (originalMessage.to != null && 0 < originalMessage.to.length) {
      diceBotMessage.to = originalMessage.to;
      if (originalMessage.to.indexOf(originalMessage.from) < 0) {
        diceBotMessage.to += ' ' + originalMessage.from;
      }
    }
    let chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) chatTab.addMessage(diceBotMessage);
  }

  static async chatCommandAsync(command: string, arg: string, gameType: string): Promise<ChatCommandResult> {
    switch (command) {
      case 'test':
        console.log(command)
        return { id: gameType, command: command, arg: arg, result: 'test', isSecret: false };
      case 'cutin':
      case 'c':
      case 'youtube':
      case 'y':
        return { id: gameType, command: command, arg: arg, result: null, isSecret: false };
      case 'help':
      case 'h':
        return { id: gameType, command: command, arg: arg, result: null, isSecret: false };
      case 'table':
      case 't':
        return { id: gameType, command: command, arg: arg, result: null, isSecret: false };
      default:
        return { id: gameType, command: command, arg: arg, result: null, isSecret: false };
    }
  }


  static async diceRollAsync(message: string, gameType: string): Promise<DiceRollResult> {
    const empty: DiceRollResult = { id: gameType, result: '', isSecret: false };
    try {
      const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
      if (!gameSystem?.COMMAND_PATTERN.test(message)) return empty;

      const result = gameSystem.eval(message);
      if (result) {
        console.log('diceRoll!!!', result.text);
        console.log('isSecret!!!', result.secret);
        return {
          id: gameSystem.ID,
          result: result.text.replace(/\n?(#\d+)\n/ig, '$1 '), // 繰り返しダイスロールは改行表示を短縮する
          isSecret: result.secret,
          isSuccess: result.success,
          isFailure: result.failure,
          isCritical: result.critical,
          isFumble: result.fumble
        };
      }
    } catch (e) {
      console.error(e);
    }
    return empty;
  }

  static async getHelpMessage(gameType: string): Promise<string> {
    try {
      const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
      return gameSystem.HELP_MESSAGE;
    } catch (e) {
      console.error(e);
    }
    return '';
  }

  static async loadGameSystemAsync(gameType: string): Promise<GameSystemClass> {
    return await DiceBot.queue.add(() => {
      const id = this.diceBotInfos.some(info => info.id === gameType) ? gameType : 'DiceBot';
      try {
        return DiceBot.loader.getGameSystemClass(id);
      } catch {
        return DiceBot.loader.dynamicLoad(id);
      }
    });
  }

  private static initializeDiceBotQueue(): PromiseQueue {
    let queue = new PromiseQueue('DiceBotQueue');
    queue.add(async () => {
      DiceBot.loader = new (await import(
        /* webpackChunkName: "lib/bcdice/bcdice-loader" */
        './bcdice/bcdice-loader')
      ).default();
      DiceBot.diceBotInfos = DiceBot.loader.listAvailableGameSystems()
        .sort((a, b) => {
          if (a.sortKey < b.sortKey) return -1;
          if (a.sortKey > b.sortKey) return 1;
          return 0;
        });
    });
    return queue;
  }
}
