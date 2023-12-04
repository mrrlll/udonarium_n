import { Injectable } from '@angular/core';

import { ChatMessage, ChatMessageContext } from '@udonarium/chat-message';
import { ChatTab } from '@udonarium/chat-tab';
import { ChatTabList } from '@udonarium/chat-tab-list';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { Network } from '@udonarium/core/system';
import { GameCharacter } from '@udonarium/game-character';
import { PeerCursor } from '@udonarium/peer-cursor';
import { StringUtil } from '@udonarium/core/system/util/string-util';
import { DiceBot } from '@udonarium/dice-bot';

const HOURS = 60 * 60 * 1000;

@Injectable()
export class ChatMessageService {
  private intervalTimer: NodeJS.Timer = null;
  private timeOffset: number = Date.now();
  private performanceOffset: number = performance.now();

  private ntpApiUrls: string[] = [
    'https://worldtimeapi.org/api/ip',
  ];

  gameType: string = '';

  constructor() { }

  get chatTabs(): ChatTab[] {
    return ChatTabList.instance.chatTabs;
  }

  calibrateTimeOffset() {
    if (this.intervalTimer != null) {
      console.log('calibrateTimeOffset was canceled.');
      return;
    }
    let index = Math.floor(Math.random() * this.ntpApiUrls.length);
    let ntpApiUrl = this.ntpApiUrls[index];
    let sendTime = performance.now();
    fetch(ntpApiUrl)
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('Network response was not ok.');
      })
      .then(jsonObj => {
        let endTime = performance.now();
        let latency = (endTime - sendTime) / 2;
        let timeobj = jsonObj;
        let st: number = new Date(timeobj.utc_datetime).getTime();
        let fixedTime = st + latency;
        this.timeOffset = fixedTime;
        this.performanceOffset = endTime;
        console.log('latency: ' + latency + 'ms');
        console.log('st: ' + st + '');
        console.log('timeOffset: ' + this.timeOffset);
        console.log('performanceOffset: ' + this.performanceOffset);
        this.setIntervalTimer();
      })
      .catch(error => {
        console.warn('There has been a problem with your fetch operation: ', error.message);
        this.setIntervalTimer();
      });
    this.setIntervalTimer();
  }

  private setIntervalTimer() {
    if (this.intervalTimer != null) clearTimeout(this.intervalTimer);
    this.intervalTimer = setTimeout(() => {
      this.intervalTimer = null;
      this.calibrateTimeOffset();
    }, 6 * HOURS);
  }

  getTime(): number {
    return Math.floor(this.timeOffset + (performance.now() - this.performanceOffset));
  }

  sendMessage(chatTab: ChatTab, text: string, gameType: string, sendFrom: string, sendTo?: string, color? :string): ChatMessage {
    let chatMessage: ChatMessageContext = {
      from: Network.peer.userId,
      to: this.findId(sendTo),
      name: this.makeMessageName(sendFrom, sendTo),
      imageIdentifier: this.findImageIdentifier(sendFrom),
      timestamp: this.calcTimeStamp(chatTab),
      tag: gameType,
      text: text,
      color: color,
      sendFrom: sendFrom //lily
    };

    //ハイド処理
    let chkMessage = ' ' + StringUtil.toHalfWidth(text).toLowerCase();
    let matches_array = chkMessage.match(/\s@(\S+)$/i);
    if( matches_array ){
      if( RegExp.$1 == 'hide' )
        chatMessage.imageIdentifier = '';

      chatMessage.text = text.replace(/([@＠]\S+)$/i,'');
    }

    let dicebot = ObjectStore.instance.get<DiceBot>('DiceBot');
    dicebot.checkSecretDiceCommand(gameType,text).then(value => {
      console.log(value); // => resolve!!

      let chatMessageAddSecretTag: ChatMessageContext = {
        from:             chatMessage.from,
        to:               chatMessage.to,
        name:             chatMessage.name,
        imageIdentifier:  chatMessage.imageIdentifier,
        timestamp:        chatMessage.timestamp,
        tag:              value ? chatMessage.tag + ' secret' : chatMessage.tag ,
        text:             chatMessage.text,
        imagePos:         chatMessage.imagePos,
        messColor:        chatMessage.messColor,
        sendFrom:         chatMessage.sendFrom
      };

      chatTab.addMessage(chatMessageAddSecretTag);
    });

    return;
  }

  sendOperationLog(text: string, logLevel: number=1) {
    for (const chatTab of this.chatTabs) {
      if (chatTab.recieveOperationLogLevel < logLevel) continue;
      let chatMessage: ChatMessageContext = {
        from: Network.peer.userId,
        //to: ChatMessageService.findId(PeerCursor.myCursor.userId),
        //to: this.findId(sendTo),
        name: PeerCursor.myCursor.name,
        imageIdentifier: PeerCursor.myCursor.imageIdentifier,
        timestamp: this.calcTimeStamp(chatTab),
        tag: 'opelog',
        text: StringUtil.cr(text),
      };

      chatTab.addMessage(chatMessage);
    }
  }

  private findId(identifier: string): string {
    let object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      return object.identifier;
    } else if (object instanceof PeerCursor) {
      return object.userId;
    }
    return null;
  }

  private findObjectName(identifier: string): string {
    let object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      return object.name;
    } else if (object instanceof PeerCursor) {
      return object.name;
    }
    return identifier;
  }

  private makeMessageName(sendFrom: string, sendTo?: string): string {
    let sendFromName = this.findObjectName(sendFrom);
    if (sendTo == null || sendTo.length < 1) return sendFromName;

    let sendToName = this.findObjectName(sendTo);
    return sendFromName + ' > ' + sendToName;
  }

  private findImageIdentifier(identifier: string): string {
    let object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      return object.imageFile ? object.imageFile.identifier : '';
    } else if (object instanceof PeerCursor) {
      return object.imageIdentifier;
    }
    return identifier;
  }

  private calcTimeStamp(chatTab: ChatTab): number {
    let now = this.getTime();
    let latest = chatTab.latestTimeStamp;
    return now <= latest ? latest + 1 : now;
  }
}
