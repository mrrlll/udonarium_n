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
import { DiceTable } from './dice-table';
import { DiceTablePalette } from './chat-palette';

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

let loader: BCDiceLoader;
let queue: PromiseQueue = initializeDiceBotQueue();

@SyncObject('dice-bot')
export class DiceBot extends GameObject {
  static diceBotInfos: GameSystemInfo[] = [];

  getDiceTables(): DiceTable[] {
    return ObjectStore.instance.getObjects(DiceTable);
  }

  async checkSecretDiceCommand(gameType,chatText): Promise<boolean> {
    let text: string = StringUtil.toHalfWidth(chatText).toLowerCase();
    let nonRepeatText = text.replace(/^(\d+)?\s+/,'repeat1 ').replace(/^x(\d+)?\s+/,'repeat1 ').replace(/repeat(\d+)?\s+/,'');
//    console.log("シークレット確認nonRepeatText:" + nonRepeatText);
    let regArray = /^s(.*)?/ig.exec(nonRepeatText);
    console.log("check secret regArray:" + regArray);
    if( !regArray ) return false;
    const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
    if (!gameSystem.COMMAND_PATTERN.test(regArray[1])) return false;
    return true;
  }

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
      })
      .on('DICE_TABLE_MESSAGE', async event => {
        console.log('ダイス表判定');

        let chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) return;

        let text: string = StringUtil.toHalfWidth(chatMessage.text);
        let splitText = text.split(/\s/);
        let gameType: string = chatMessage.tag;

        let diceTable = this.getDiceTables() ;
        if( !diceTable )return;
        if( splitText.length == 0 )return;

        console.log('コマンド候補:' + splitText[0] );

        let rollDice = null ;
        let rollTable = null;
        for( let table of diceTable){
          if( table.command == splitText[0] ){
            rollTable = table;
          }
        }
        if( !rollTable ) return;

        try {
          let regArray = /^((\d+)?\s+)?([^\s]*)?/ig.exec(rollTable.dice);
          let repeat: number = (regArray[2] != null) ? Number(regArray[2]) : 1;
          let rollText: string = (regArray[3] != null) ? regArray[3] : text;
          let finalResult: DiceRollResult = { id: 'DiceBot', result: '', isSecret: false };
          for (let i = 0; i < repeat && i < 32; i++) {
            let rollResult = await DiceBot.diceRollAsync(rollText, gameType);
            if (rollResult.result.length < 1) break;

            finalResult.result += rollResult.result;
            finalResult.isSecret = finalResult.isSecret || rollResult.isSecret;
            if (1 < repeat) finalResult.result += ` #${i + 1}`;
          }
          console.log('finalResult.result:' + finalResult.result );

          let rolledDiceNum = finalResult.result.match(/\d+$/);
          let tableAns = "ダイス目の番号が表にありません";
          if( rolledDiceNum ){
            console.log('rolledDiceNum:' + rolledDiceNum[0] );

            let tablePalette = rollTable.diceTablePalette.getPalette();
              console.log('tablePalette:' + tablePalette );
            for( let i in tablePalette ){
              console.log('oneTable:' + tablePalette[i] );

              let splitOneTable = tablePalette[i].split(/[:：,，\s]/);
              if( splitOneTable[0] == rolledDiceNum[0] ){
                tableAns = tablePalette[i];
              }
            }

          }
          finalResult.result += '\n'+tableAns;
          this.sendResultMessage(finalResult , chatMessage);

        } catch (e) {
          console.error(e);
        }
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
    return await queue.add(() => {
      const id = this.diceBotInfos.some(info => info.id === gameType) ? gameType : 'DiceBot';
      try {
        return loader.getGameSystemClass(id);
      } catch {
        return loader.dynamicLoad(id);
      }
    });
  }
}

function initializeDiceBotQueue(): PromiseQueue {
  let queue = new PromiseQueue('DiceBotQueue');
  queue.add(async () => {
    loader = new (await import(
      /* webpackChunkName: "lib/bcdice/bcdice-loader" */
      './bcdice/bcdice-loader')
    ).default;
    DiceBot.diceBotInfos = loader.listAvailableGameSystems()
      .sort((a, b) => {
        if (a.sortKey < b.sortKey) return -1;
        if (a.sortKey > b.sortKey) return 1;
        return 0;
      });
  });
  return queue;
}
