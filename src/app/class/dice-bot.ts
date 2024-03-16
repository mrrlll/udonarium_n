import { GameSystemInfo } from 'bcdice/lib/bcdice/game_system_list.json';
import GameSystemClass from 'bcdice/lib/game_system';

import BCDiceLoader from './bcdice/bcdice-loader';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from './chat-message';
import { ChatTab } from './chat-tab';
import { SyncObject } from './core/synchronize-object/decorator';
import { GameObject } from './core/synchronize-object/game-object';
import { GameCharacter } from './game-character';
import { ObjectStore } from './core/synchronize-object/object-store';
import { EventSystem } from './core/system';
import { PromiseQueue } from './core/system/util/promise-queue';
import { StringUtil } from './core/system/util/string-util';
import { DiceTable } from './dice-table';

import { PeerCursor } from './peer-cursor';

interface ResourceEditOption {
  limitMinMax: boolean;
  zeroLimit: boolean;
  isErr: boolean;
}

interface ResourceEdit {
  target: string;
  operator: string;
  diceResult: string;
  command: string;
  replace: string;
  isDiceRoll: boolean;
  calcAns: number;
  nowOrMax: string;
  option: ResourceEditOption;
  object: GameCharacter;
  targeted: boolean;
}

interface ResourceByCharacter{
  resourceCommand : string;
  object : GameCharacter;
}

interface BuffByCharacter{
  buffCommand : string;
  object : GameCharacter;
}

interface BuffEdit {
  command: string;
  object : GameCharacter;
  targeted : boolean;
}

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
  static diceBotInfos: GameSystemInfo[] = [];

  private static loader: BCDiceLoader;
  private static queue: PromiseQueue = DiceBot.initializeDiceBotQueue();

  static getCustomGameSystemInfo(ststem: GameSystemClass, locale: string): GameSystemInfo{
    const gameSystemInfo: GameSystemInfo = {
      id: ststem.ID,
      name: ststem.NAME,
      className: ststem.ID,
      sortKey: ststem.SORT_KEY,
      locale: locale,
      superClassName: "Base",
    };
    return gameSystemInfo;
  }

  private static initializeDiceBotQueue(): PromiseQueue {
    let queue = new PromiseQueue('DiceBotQueue');
    queue.add(async () => {
      DiceBot.loader = new (await import(
        /* webpackChunkName: "lib/bcdice/bcdice-loader" */
        './bcdice/bcdice-loader')
      ).default;
      DiceBot.diceBotInfos = DiceBot.loader.listAvailableGameSystems()
      .sort((a, b) => {
        if (a.sortKey < b.sortKey) return -1;
        if (a.sortKey > b.sortKey) return 1;
        return 0;
      });
  });
  return queue;
}

  getDiceTables(): DiceTable[] {
    return ObjectStore.instance.getObjects(DiceTable);
  }

  static deleteMyselfResourceBuff(str: string): string{
    let beforeIsSpace = true;
    let beforeIsT = false;
    let tCommand = false;
    let deleteCommand = false;
    let str2 = '';
    for (let i = 0; i < str.length; i++) {
      let chktext :string = str[i];

      if ( beforeIsSpace && chktext.match(/[tTｔＴ]/)){
        beforeIsSpace = false;
        beforeIsT = true;
        deleteCommand = false;
        tCommand = false;
        // console.log( 'sendChat文字置換' + 'match(/[tTｔＴ]/)');
        str2 = str2 + str[i];
        continue;
      }

      if ( beforeIsT && chktext.match(/[:：&＆]/)){
        beforeIsSpace = false;
        beforeIsT = false;
        deleteCommand = false;
        tCommand = true;
        // console.log( 'sendChat文字置換' + 'match(/[:：&＆]/)');
        str2 = str2 + str[i];
        continue;
      }

      if ( (tCommand || beforeIsSpace || deleteCommand) && chktext.match(/[:：&＆]/)){
        beforeIsSpace = false;
        beforeIsT = false;
        deleteCommand = true;
        tCommand = false;
        continue;
      }

      if ( chktext.match(/\s/)){
        beforeIsSpace = true;
        beforeIsT = false;
        deleteCommand = false;
        tCommand = false;
        str2 = str2 + str[i];
        // console.log( 'sendChat文字置換' + 'match(/\\s/)');
        continue;
      }else{
        beforeIsSpace = false;
      }

      if(deleteCommand){
        continue;
      }

      str2 = str2 + str[i];
    }
    return str2;
  }

  checkSecretEditCommand(chatText: string): boolean {
    const text: string = ' ' + StringUtil.toHalfWidth(chatText).toLowerCase();
    const replaceText = text.replace('：', ':');
    let m = replaceText.match(/\sST?:/i);
    // console.log(m);
    if( m ) return true;
    return false;
  }

  checkSecretDiceCommand(gameSystem: GameSystemClass, chatText: string): boolean {
    const text: string = StringUtil.toHalfWidth(chatText).toLowerCase();
    const nonRepeatText = text.replace(/^(\d+)?\s+/, 'repeat1 ').replace(/^x(\d+)?\s+/, 'repeat1 ').replace(/repeat(\d+)?\s+/, '');
    const regArray = /^s(.*)?/ig.exec(nonRepeatText);
    // console.log('checkSecretDiceCommand:' + chatText + ' gameSystem.name:' + gameSystem.name);

    if ( gameSystem.COMMAND_PATTERN ){
      return regArray && gameSystem.COMMAND_PATTERN.test(regArray[1]);
    }
    // console.log('checkSecretDiceCommand:' + false);
    return false;
  }

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    EventSystem.register(this)
      .on('SEND_MESSAGE', async event => {
        let chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) return;

        let text: string;
        if (event.data.messageTrget){
          text = StringUtil.toHalfWidth(event.data.messageTrget.text);
        }else{
          text = StringUtil.toHalfWidth(chatMessage.text);
        }

        const gameType: string = chatMessage.tags ? chatMessage.tags[0] : '';

        if (text.startsWith('/')) {
          const [_, command, arg] = /^\/(\w+)\s*(.*)/i.exec(text) || [];
          if (command) {
            const commandResult = await DiceBot.chatCommandAsync(command, arg);
            if (commandResult.result) {
              this.sendChatCommandResultMessage(commandResult, chatMessage);
            }
          }
        }

        try {
          const regArray = /^((\d+)?\s+)?(.*)?/ig.exec(text);
          const repeat: number = (regArray[2] != null) ? Number(regArray[2]) : 1;
          let rollText: string = (regArray[3] != null) ? regArray[3] : text;
          // console.log('SEND_MESSAGE gameType :' + gameType);
          const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
          if ( gameSystem.COMMAND_PATTERN ){
            if ( !gameSystem.COMMAND_PATTERN.test(rollText)) { return; }
          }
          if (!rollText || repeat < 1 ) { return; }

          // 繰り返しコマンドに変換
          if (repeat > 1) {
            rollText = `x${repeat} ${rollText}`;
          }

          const rollResult = await DiceBot.diceRollAsync(rollText, gameSystem);
          if (!rollResult.result) { return; }

          if (event.data.messageTrget){
            if (event.data.messageTrget.object){
              this.sendResultMessage(rollResult, chatMessage, ' [' + event.data.messageTrget.object.name +']');
            }else{
              this.sendResultMessage(rollResult, chatMessage);
            }
          }else{
            this.sendResultMessage(rollResult, chatMessage);
          }
        } catch (e) {
          console.error(e);
        }
        return;
      })
      .on('DICE_TABLE_MESSAGE', async event => {
        let chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) return;

        let text: string = StringUtil.toHalfWidth(chatMessage.text);
        let splitText = text.split(/\s/);
        let gameType: string = chatMessage.tags ? chatMessage.tags[0]:'' ;

        let diceTable = this.getDiceTables() ;
        if( !diceTable )return;
        if( splitText.length == 0 )return;

        let rollDice = null;
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
            const gameSystem = await DiceBot.loadGameSystemAsync(rollTable.diceTablePalette.dicebot);
            let rollResult = await DiceBot.diceRollAsync(rollText, gameSystem);
            if (rollResult.result.length < 1) break;

            finalResult.result += rollResult.result;
            finalResult.isSecret = finalResult.isSecret || rollResult.isSecret;
            if (1 < repeat) finalResult.result += ` #${i + 1}`;
          }
          // console.log('finalResult.result:' + finalResult.result );

          let rolledDiceNum = finalResult.result.match(/\d+$/);
          let tableAns = "ダイス目の番号が表にありません";
          if( rolledDiceNum ){
            let tablePalette = rollTable.diceTablePalette.getPalette();
              // console.log('tablePalette:' + tablePalette );
            for( let i in tablePalette ){
              // console.log('oneTable:' + tablePalette[i] );

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
      })
      .on('RESOURCE_EDIT_MESSAGE', async event => {
        const chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) { return; }

        const text: string = StringUtil.toHalfWidth(chatMessage.text);
        const gameType: string = chatMessage.tags ? chatMessage.tags[0] : '';

        this.checkResourceEditCommand(chatMessage, event.data.messageTargetContext ? event.data.messageTargetContext: []);
        return;
      });
  }

  // GameObject Lifecycle
  onStoreRemoved() {
    super.onStoreRemoved();
    EventSystem.unregister(this);
  }

  private messageSendGameCharacter( from: string): GameCharacter{
    let object = ObjectStore.instance.get<GameCharacter>(from);
    if (object instanceof GameCharacter) {
      return object;
    }else{
      return null;
    }
  }

  private checkResourceEditCommand(originalMessage: ChatMessage , messageTargetContext: ChatMessageTargetContext[]){
    let resourceByCharacter: ResourceByCharacter[] = [];
    let buffByCharacter: BuffByCharacter[] = [];

    let sendFromObject: GameCharacter = this.messageSendGameCharacter(originalMessage.sendFrom);
    let isSecret: boolean = false;

    for (const oneMessageTargetContext of messageTargetContext) {
      let text: string = ' ' + oneMessageTargetContext.text;
      let isMatch: boolean = text.match(/(\s[sSｓＳ][tTｔＴ]?[:：&＆])/i) ? true : false;
      if(isMatch){
        isSecret = true;
      }

      let text2: string = text.replace(/(\s[sSｓＳ][tTｔＴ][:：])/i, ' t:');
      let text3: string = text2.replace(/(\s[sSｓＳ][:：])/i, ' :');
      let text4: string = text3.replace(/([tTｔＴ][:：])/gi, 't:');
      let text5: string = text4.replace(/([tTｔＴ][&＆])/gi, 't&');
      let text6: string = text5.replace(/([:：])/gi, ':');
      let text7: string = text6.replace(/([&＆])/gi, '&');

      let splitText:string[] = text7.split(/\s/);

      let resourceCommand: string[] = [];
      let buffCommand: string[] = [];
      let allEditList: ResourceEdit[] = null;

      for (const chktxt of splitText) {
        // console.log('chktxt=' + chktxt);
        if ( chktxt.match(/^(t?[:&][^:：&＆])+/gi)){
          //正常。処理無し
        }else{
          continue;
        }

        let resultRes = chktxt.match(/t?:[^:：&＆]+/gi);
        let resultBuff = chktxt.match(/t?&[^:：&＆]+/gi);

        if ( resultRes ){
          for( let res of resultRes){
            let resByCharacter :ResourceByCharacter = {
              resourceCommand: '',
              object: null,
            }
            resByCharacter.resourceCommand = res;
            resByCharacter.object = oneMessageTargetContext.object;
            resourceByCharacter.push(resByCharacter);
          }
        }
        if ( resultBuff ){
          for( let buff of resultBuff){
            let bByCharacter :BuffByCharacter = {
              buffCommand: '',
              object: null,
            }
            bByCharacter.buffCommand = buff;
            bByCharacter.object = oneMessageTargetContext.object;
            buffByCharacter.push(bByCharacter);
          }
        }
      }
    }
    this.resourceEditProcess(sendFromObject, resourceByCharacter , buffByCharacter, originalMessage , isSecret);
  }

  resourceEditParseOption( text : string): ResourceEditOption{

    let ans: ResourceEditOption = {
      limitMinMax: false,
      zeroLimit: false,
      isErr: false
    };
    const mat = StringUtil.toHalfWidth(text).match(/([A-CE-Z]+)$/i);
    if (!mat) return ans;
    let option = mat[1];

    if (option.match(/L/i)){
      option = option.replace(/L/i, '');
      ans.limitMinMax = true;
    }

    if (option.match(/Z/i)){
      option = option.replace(/Z/i, '');
      ans.zeroLimit = true;
    }else{
      ans.zeroLimit = false;
    }

    if (option.length != 0){
      ans.isErr = true;
    }

    return ans;
  }

  private resourceCommandToEdit(oneResourceEdit: ResourceEdit, text: string, object: GameCharacter, targeted: boolean): boolean{
    // console.log('リソース変更コマンド処理開始');
//    console.log(object.name);
    oneResourceEdit.object = object;
    oneResourceEdit.targeted = targeted;
    const replaceText = ' ' + text.replace('：', ':').replace('＋', '+').replace('－', '-').replace('＝', '=').replace('＞', '>');

    // console.log('リソース変更：' + replaceText);
    const resourceEditRegExp = /[:]([^-+=>]+)([-+=>])(.*)/;
    const resourceEditResult = replaceText.match(resourceEditRegExp);
    if (resourceEditResult[2] != '>' && resourceEditResult[3] == '') { return false;}

    let chkNowOrMaxString: string = resourceEditResult[1];
    let reg1: string;
    let reg1HalfWidth: string;

    let namematch = chkNowOrMaxString.match(/(.+)([\^＾]$)/);
    let nowOrMax = '';
    if (namematch) {
      reg1 = namematch[1];
      reg1HalfWidth = StringUtil.toHalfWidth(reg1);
      oneResourceEdit.nowOrMax = 'max';
    }else{
      reg1 = resourceEditResult[1];
      reg1HalfWidth = StringUtil.toHalfWidth(reg1);
      oneResourceEdit.nowOrMax = 'now';
    }

    const reg2: string = resourceEditResult[2];
    oneResourceEdit.operator = reg2;                            // 演算符号

    if (object.chkChangeStatusName(reg1)){
      oneResourceEdit.target = reg1;                             // 操作対象検索文字タイプ生値
    }else if (object.chkChangeStatusName(reg1HalfWidth)){
      oneResourceEdit.target = reg1HalfWidth;                    // 操作対象検索文字半角化
    }else{
      return false; // 対象なし実行失敗
    }

    if ( oneResourceEdit.operator == '>' ){
      oneResourceEdit.replace = resourceEditResult[3];
    }else{
      let reg3: string = resourceEditResult[3].replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');
      const commandPrefix = oneResourceEdit.operator == '-' ? '-' : '';
      oneResourceEdit.command = commandPrefix + StringUtil.toHalfWidth(reg3) + '+(1d1-1)';
      // 操作量C()とダイスロールが必要な場合分けをしないために+(1d1-1)を付加してダイスロール命令にしている

      // console.log( reg1 + '/' + reg2 + '/' + reg3 );
      reg3 = reg3.replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');

      const optionCommand = this.resourceEditParseOption(resourceEditResult[3]);
      if (optionCommand.isErr){
        return false; // 実行失敗
      }
      oneResourceEdit.option = optionCommand;

      if (StringUtil.toHalfWidth(reg3).match(/\d[dD]/)) {
        oneResourceEdit.isDiceRoll = true;
      } else {
        oneResourceEdit.isDiceRoll = false;
      }
    }
    return true;
  }

  defaultResourceEdit(): ResourceEdit{
    let oneResourceEdit: ResourceEdit = {
      target: '',
      operator: '',
      diceResult: '',
      command: '',
      replace: '',
      isDiceRoll: false,
      calcAns: 0,
      nowOrMax: 'now',
      option : null,
      object : null,
      targeted : false
    };
    return oneResourceEdit;
  }

  async resourceEditProcess(sendFromObject , resourceByCharacter: ResourceByCharacter[], buffByCharacter: BuffByCharacter[], originalMessage: ChatMessage, isSecret: Boolean){

    const allEditList: ResourceEdit[] = [];
    const gameSystem = await DiceBot.loadGameSystemAsync(originalMessage.tags ? originalMessage.tags[0] : '');

    let targetObjects: GameCharacter[] = [];
    // console.log('resourceEditProcess');
    // console.log(resourceByCharacter);
    for (const res of resourceByCharacter){
      let oneText = res.resourceCommand;
      let targeted = oneText.match(/^t:/i) ? true :false;
      let obj :GameCharacter;

      if (targeted) {
        let object = res.object;
        let oneResourceEdit: ResourceEdit = this.defaultResourceEdit();
        if ( !this.resourceCommandToEdit(oneResourceEdit, oneText, object, targeted) )return;
        if (oneResourceEdit.operator != '>') {
          // ダイスロール及び四則演算
          try {
            const rollResult = await DiceBot.diceRollAsync(oneResourceEdit.command, gameSystem);
            if (!rollResult.result) { return null; }
            const splitResult = rollResult.result.split(' ＞ ');
            oneResourceEdit.diceResult = splitResult[splitResult.length - 2].replace(/\+\(1\[1\]\-1\)$/, '');
            const resultMatch = rollResult.result.match(/([-+]?\d+)$/); // 計算結果だけ格納
            oneResourceEdit.calcAns = parseInt(resultMatch[1], 10);
          } catch (e) {
            console.error(e);
          }
        }
        allEditList.push(oneResourceEdit);
      }else{
        if( sendFromObject == null) {
          obj = null;
          // console.log('キャラクターでないリソースは操作できません');
          return;
        }else{
          obj = sendFromObject;
          let oneResourceEdit: ResourceEdit = this.defaultResourceEdit();
          if ( !this.resourceCommandToEdit(oneResourceEdit, oneText, obj, targeted) )return;
          if (oneResourceEdit.operator != '>') {
            // ダイスロール及び四則演算
            try {
              const rollResult = await DiceBot.diceRollAsync(oneResourceEdit.command, gameSystem);
              if (!rollResult.result) { return null; }
              const splitResult = rollResult.result.split(' ＞ ');
              oneResourceEdit.diceResult = splitResult[splitResult.length - 2].replace(/\+\(1\[1\]\-1\)$/, '');
              const resultMatch = rollResult.result.match(/([-+]?\d+)$/); // 計算結果だけ格納
              oneResourceEdit.calcAns = parseInt(resultMatch[1], 10);
            } catch (e) {
              console.error(e);
            }
          }
          allEditList.push(oneResourceEdit);
        }
      }
    }
    let repBuffCommandList: BuffEdit[] = [];
    for ( const buff of buffByCharacter ){
      let oneText = buff.buffCommand;
      let targeted = oneText.match(/^t&/i) ? true :false;
      let obj :GameCharacter;
      if (targeted) {
        let object = buff.object;
        const replaceText = oneText.replace('＆', '&').replace(/＋$/, '+').replace(/－$/, '-');
        let oneBuffEdit: BuffEdit = {
          command: replaceText,
          object : object,
          targeted : targeted
        };
        repBuffCommandList.push(oneBuffEdit);
      }else{
        if( sendFromObject == null) {
          obj = null;
          // console.log('キャラクターでないものに対してバフ操作はできません');
          return;
        }else{
          const replaceText = oneText.replace('＆', '&').replace(/＋$/, '+').replace(/－$/, '-');
          let oneBuffEdit: BuffEdit = {
            command: replaceText,
            object : sendFromObject,
            targeted : targeted
          };
          repBuffCommandList.push(oneBuffEdit);
        }
      }
    }

    this.resourceBuffEdit( allEditList , repBuffCommandList, originalMessage, isSecret);
    return;
  }

  private resourceTextEdit(edit: ResourceEdit, character: GameCharacter): string{
    character.setStatusText(edit.target, edit.replace);
    let ansText = edit.target + '＞' + edit.replace + '    ';
    return ansText;
  }

  private resourceEdit(edit: ResourceEdit, character: GameCharacter): string{
    let optionText = '';
    let oldNum = 0;
    let newNum = 0;
    let maxNum = null;
    let nowOrMax = edit.nowOrMax;

    maxNum = character.getStatusValue(edit.target, 'max');
    if(nowOrMax == 'max' && maxNum == null) {
      nowOrMax = 'now';
    }
    if(nowOrMax == 'now') {
      oldNum = character.getStatusValue(edit.target, 'now');
    }else{
      oldNum = character.getStatusValue(edit.target, 'max');
    }

    if (edit.operator == '=') {
      newNum = edit.calcAns;
    } else {
      const flag = edit.option.zeroLimit;
      if (flag && edit.operator == '+' && (edit.calcAns < 0)) {
        newNum = oldNum + 0;
        optionText = '(0制限)';
      }else if (flag && edit.operator == '-' && (edit.calcAns > 0)) {
        newNum = oldNum + 0;
        optionText = '(0制限)';
      }else{
        newNum = oldNum + edit.calcAns;
      }
    }

    if (edit.option.limitMinMax && maxNum != null){
      if (newNum > maxNum && nowOrMax == 'now'){
        newNum = maxNum;
        optionText = '(最大)';
      }
      if (newNum < 0 ){
        newNum = 0;
        optionText = '(最小)';
      }
    }

    if(nowOrMax == 'now') {
      character.setStatusValue(edit.target, 'now', newNum);
    }else{
      character.setStatusValue(edit.target, 'max', newNum);
    }

    const operatorText = edit.operator == '-' ? '' : edit.operator;
    const changeMax = nowOrMax == 'max' ? '(最大値)' : '';
    const ansText = edit.target + changeMax + ':' + oldNum + operatorText + edit.diceResult + '＞' + newNum + optionText + '    ';
    return ansText;
  }

  private buffEdit(buff: BuffEdit, character: GameCharacter): string{
    let command = buff.command;
    let text = '';
    if (buff.targeted) {
      text += '[' + character.name + '] ';
    }
    if ( command.match(/^[tTｔＴ]?&[RＲrｒ]-$/i) ){
      character.decreaseBuffRound();
      text += 'バフRを減少';
      text += '    ';
    }else if ( command.match(/^[tTｔＴ]?&[RＲrｒ][+]$/i) ){
      character.increaseBuffRound();
      text += 'バフRを増加';
      text += '    ';
    }else if ( command.match(/^[tTｔＴ]?&[DＤdｄ]$/i) ){
      character.deleteZeroRoundBuff();
      text += '0R以下のバフを消去';
      text += '    ';
    }else if ( command.match(/^[tTｔＴ]?&.+-$/i) ){
      let match = command.match(/^[tTｔＴ]?&(.+)-$/i);
      // console.log('match' + match);
      const reg1 = match[1];
      if (character.deleteBuff(reg1) ){
        text += reg1 + 'を消去';
        text += '    ';
      }
    }else{
      const splittext = command.replace(/^[tTｔＴ]?&/i, '').split('/');
      let round = null;
      let sub = '';
      let buffname = '';
      let bufftext = '';
      buffname = splittext[0];
      bufftext = splittext[0];
      if ( splittext.length > 1){ sub = splittext[1]; bufftext = bufftext + '/' + splittext[1]; }
      if ( splittext.length > 2){
        if( splittext[2] ){
          round = parseInt(splittext[2]);
          if( Number.isNaN(round)){
            round = 3;
          }
        }else{
          round = 3;
        }bufftext = bufftext + '/' + round + 'R';
      }

      character.addBuffRound(buffname, sub, round);
      text += 'バフを付与 ' + bufftext;
      text += '    ';
    }
    return text;
  }

  private resourceBuffEdit( allEditList: ResourceEdit[] , buffList: BuffEdit[], originalMessage: ChatMessage , isSecret: Boolean){
    let isTarget: Boolean = false;
    let text = '';
// リソース処理
    let isDiceRoll = false;
    let character: GameCharacter;
    for ( let edit of allEditList) {
      character = edit.object;
      if ( edit.targeted) {
        text += '['+ character.name +'] ';
      }
      if (edit.operator == '>'){
        text += this.resourceTextEdit(edit, character);
      }else{
        text += this.resourceEdit(edit, character);
      }
      if ( edit.isDiceRoll ) { isDiceRoll = true; }
    }
// バフ処理
    for ( let buff of buffList) {
      character = buff.object;
      text += this.buffEdit(buff, character);
    }
    text = text.replace(/\s\s\s\s$/, '');

    if ( text == '')return;
    let fromText;
    let nameText;
    if ( isDiceRoll ){
      fromText = 'System-BCDice';
      nameText = `<BCDice：` + originalMessage.name + '>';
    }else{
      fromText = 'System';
      nameText = originalMessage.name;
    }
    const resourceMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: fromText,
      timestamp: originalMessage.timestamp + 2,
      imageIdentifier: PeerCursor.myCursor.imageIdentifier,
      tag: isSecret ? 'system secret': 'system',
      name: nameText,
      text,
      messColor: originalMessage.messColor
    };
    const chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) { chatTab.addMessage(resourceMessage); }
  }

  private sendResultMessage(rollResult: DiceRollResult, originalMessage: ChatMessage, multiTargetOption?: string) {
    let id: string = rollResult.id.split(':')[0];
    // console.log(rollResult)
    let result: string = rollResult.result;
    const isSecret: boolean = rollResult.isSecret;
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

    const gameType: string = originalMessage.tags ? originalMessage.tags[0] : '';

    const diceBotMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'System-BCDice',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: 'dice',
      tag: `${isSecret ? ' secret ' : ''}${tag}`,
      name: isSecret ? `<Secret-${gameType}：` + originalMessage.name + '>' : `<${gameType}：` + originalMessage.name + '>',
      text: multiTargetOption? result + multiTargetOption : result,
      color: originalMessage.color,
    };

    if (originalMessage.to != null && 0 < originalMessage.to.length) {
      diceBotMessage.to = originalMessage.to;
      if (originalMessage.to.indexOf(originalMessage.from) < 0) {
        diceBotMessage.to += ' ' + originalMessage.from;
      }
    }
    diceBotMessage.text = this.kemonoDiceCheck(rollResult, originalMessage, diceBotMessage);
    const chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) chatTab.addMessage(diceBotMessage);
  }

  private kemonoDiceCheck(rollResult: DiceRollResult, originalMessage: ChatMessage, diceBotMessage: ChatMessageContext): string{
    const gameType: string = originalMessage.tags ? originalMessage.tags[0] : '';
    if ( gameType != 'KemonoNoMori' ) return diceBotMessage.text;
    let kemonoDiceResult: string = diceBotMessage.text;

    const gameCharacter = ObjectStore.instance.get<GameCharacter>(originalMessage.sendFrom);

    // 先制値決定かどうか
    if(originalMessage.text.includes("先制値決定")){
      console.log("先制値",rollResult.result);
      const results: string[] = rollResult.result.split(" ");
      const firstValue: string = results[results.length - 1];
      const element = gameCharacter.detailDataElement.getElementsByName("先制値")[0];
      if(element !== undefined){
        element.value = firstValue;
      }
      return diceBotMessage.text;
    }
    // 継続判定確認
    if(rollResult.isSuccess){
      if(rollResult.isCritical){
        gameCharacter.continueDice = 10;
      } else {
        const regArray = /＞\s(\d+)\s＞/ig.exec(rollResult.result);
        if(regArray){
          gameCharacter.continueDice = Number(regArray[1]);
        }
      };
    } else {
      gameCharacter.continueDice = null;
    }

    // 成功度カウント
    if(originalMessage.text.match(/^KA/)){
      gameCharacter.kemonoSuccessCount = 0;
      if(rollResult.isSuccess){
        let number = Number(rollResult.result.match(/\((\d+D\d+<=)(\d+)\)/)[2]);
        gameCharacter.kemonoSuccessCount = Math.floor(number / 10 + 1);
        kemonoDiceResult += `現在の成功度：${gameCharacter.kemonoSuccessCount}`;
        return kemonoDiceResult;
      }
    } else if(originalMessage.text.match(/^KC/)){
      if(rollResult.isFumble){
        kemonoDiceResult += ` 成功度：0`;
        return kemonoDiceResult;
      }
      if(rollResult.isSuccess){
        gameCharacter.kemonoSuccessCount++;
        kemonoDiceResult += `現在の成功度：${gameCharacter.kemonoSuccessCount}`;
        return kemonoDiceResult;
      } else if(rollResult.isFailure){
        kemonoDiceResult += `　成功度：${gameCharacter.kemonoSuccessCount}`;
        return kemonoDiceResult;
      }
    }
    return kemonoDiceResult;
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

  static async chatCommandAsync(command: string, arg: string): Promise<ChatCommandResult> {
    const id = 'ChatCommands';
    switch (command) {
      case 'test':
        // console.log(command)
        return { id: id, command: command, arg: arg, result: 'test', isSecret: false };
      case 'cutin':
      case 'c':
      case 'youtube':
      case 'y':
        return { id: id, command: command, arg: arg, result: null, isSecret: false };
      case 'help':
      case 'h':
        return { id: id, command: command, arg: arg, result: null, isSecret: false };
      case 'table':
      case 't':
        return { id: id, command: command, arg: arg, result: null, isSecret: false };
      default:
        return { id: id, command: command, arg: arg, result: null, isSecret: false };
    }
  }


  static async diceRollAsync(message: string, gameSystem: GameSystemClass): Promise<DiceRollResult> {
    return DiceBot.queue.add(() => {
      try {
        const result = gameSystem.eval(message);
        if (result) {
          // console.log('diceRoll!!!', result.text);
          // console.log('isSecret!!!', result.secret);
          return {
            id: gameSystem.ID,
            result: `${result.text}`.replace(/\n?(#\d+)\n/ig, '$1 '), // 繰り返しダイスロールは改行表示を短縮する
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
      return { id: gameSystem.ID, result: '', isSecret: false };
    });
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
      const id = this.diceBotInfos.some((info) => info.id === gameType) ? gameType : 'DiceBot';
      try {
        return DiceBot.loader.getGameSystemClass(id);
      } catch {
        return DiceBot.loader.dynamicLoad(id);
      }
    });
  }
}
