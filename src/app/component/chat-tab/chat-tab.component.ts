import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { ChatMessage, ChatMessageContext } from '@udonarium/chat-message';
import { ChatTab } from '@udonarium/chat-tab';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem } from '@udonarium/core/system';
import { ResettableTimeout } from '@udonarium/core/system/util/resettable-timeout';
import { setZeroTimeout } from '@udonarium/core/system/util/zero-timeout';

import { PanelService } from 'service/panel.service';

type ScrollPosition = { top: number, bottom: number, clientHeight: number, scrollHeight: number, };

const ua = window.navigator.userAgent.toLowerCase();
const isiOS = ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;

const now = Date.now()
@Component({
  selector: 'chat-tab',
  templateUrl: './chat-tab.component.html',
  styleUrls: ['./chat-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatTabComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges, AfterViewChecked {

  sampleMessages: ChatMessageContext[] = [
    {
      from: 'System',
      timestamp: 1663923600000,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: 'サーバーを使用しないTRPGオンセツールです。参加者同士で接続し、コマや画像ファイルなどを同期します。\n本家ユドナリウム(https://udonarium.app/)をベースにカスタマイズされた様々なユドナリウムシステムを参考にし、機能を実装しています。'
    },
    {
      from: 'System',
      timestamp: 1663923600000,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: 'バグ修正＆機能追加等のアップデート情報を以下でアナウンスしていきます。'
    },
    {
      from: 'System',
      timestamp: 1664182800000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: '複数人で同時にカードを見れる機能を追加。\n・「自分だけで見る」されているカードに対しての右クリックメニューに「自分も見る」が追加されます。\n　「自分も見る」を実行することで同時にカードを閲覧することができます。\n・「自分も見る」しているカードに対しての右クリックメニューに「見るのをやめる」が追加されます。\n　「見るのをやめる」を実行することで「自分も見る」状態を解除します。\n・自分を含む複数人が見ているカードに対しての右クリックメニューに「やっぱり自分だけでみる」が追加されます。\n　「やっぱり自分だけでみる」を実行することで自分を含む複数人が見ている状態のカードを自分だけが見ている状態にします。'
    },
    {
      from: 'System',
      timestamp: 1664182800000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: 'カットイン機能を追加\n・YouTubeなどを再生できる機能。YouTubeの利用規約に則って使用してください。'
    },
    {
      from: 'System',
      timestamp: 1664182800000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: 'SE再生機能を追加\n・音楽（ジュークボックス）ウインドウに追加された音声ファイルをBGMとは別にSEとして再生することができます。\n　SE再生はループ再生されず、１度のみの再生となります。\n・SE再生機能追加に伴いSEの音量調節に対応'
    },
    {
      from: 'System',
      timestamp: 1664182800000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: 'タイマー機能を追加\n・設定した時間が経過したらアラームを鳴らす機能です。\n　画面に表示されているタイマーにマウスオーバーすることで操作メニューが表示されます。タイマーを消した後再表示する場合はメニューから行えます。\n※アラームの音量調整は後日対応予定'
    },
    {
      from: 'System',
      timestamp: 1664269200000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: 'GM＆観戦モードを追加\n・接続情報ウインドウのモード切り替え用のチェックボックスでモード切り替え。\n裏面になっているカードの表面が透けて表示されます。\nGM&観戦者モード中はニックネームの先頭に「👁」マークが表示されます。'
    },
    {
      from: 'System',
      timestamp: 1664371800000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: 'アラーム音量調整機能を追加\n・元々視聴音量だった部分をアラームの音量調整に割り当てているので視聴音量調節も兼ねています。'
    },
    {
      from: 'System',
      timestamp: 1664373600000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: '接続URL取得機能を追加\n・接続情報ウインドウに接続URL取得ボタンを追加しました。\n　コピーしたURLを共有することで直接接続してもらうことができるようになりました。\n・接続URL取得機能実装に伴いIDをコピーする機能、ボタンを削除'
    },
    {
      from: 'System',
      timestamp: 1664382600000,
      imageIdentifier: '',
      tag: '',
      name: '仕様変更',
      text: 'アラームのタイプをSEに変更\n音量はSEの音量で変更することができます。'
    },
    {
      from: 'System',
      timestamp: 1674464400000,
      imageIdentifier: '',
      tag: '',
      name: 'アップデート',
      text: 'PDFアップロード＆閲覧機能の追加\nPDFファイルをドラッグすることで画面左下にストックされていきます。\nGMは専用のパネルから特定の人物にのみ見せるなどの設定が行なえます。'
    },
    {
      from: 'System',
      timestamp: now,
      imageIdentifier: '',
      tag: '',
      name: 'システム情報',
      text: 'チュートリアル＆アップデート情報は以上です。これらのチャットは誰かが最初のチャットを入力すると非表示になります。' },
  ];

  private topTimestamp = 0;
  private botomTimestamp = 0;

  private needUpdate = true;

  @ViewChild('logContainer', { static: true }) logContainerRef: ElementRef<HTMLDivElement>;
  @ViewChild('messageContainer', { static: true }) messageContainerRef: ElementRef<HTMLDivElement>;

  private topElm: HTMLElement = null;
  private bottomElm: HTMLElement = null;
  private topElmBox: DOMRect = null;
  private bottomElmBox: DOMRect = null;

  private topIndex = 0;
  private bottomIndex = 0;

  private minMessageHeight: number = 61;

  private preScrollTop = 0;
  private scrollSpeed = 0;

  private _chatMessages: ChatMessage[] = [];
  get chatMessages(): ChatMessage[] {
    if (!this.chatTab) return [];
    if (this.needUpdate) {
      this.needUpdate = false;
      let chatMessages = this.chatTab ? this.chatTab.chatMessages : [];
      this.adjustIndex();

      this._chatMessages = chatMessages.slice(this.topIndex, this.bottomIndex + 1);
      this.topTimestamp = 0 < this._chatMessages.length ? this._chatMessages[0].timestamp : 0;
      this.botomTimestamp = 0 < this._chatMessages.length ? this._chatMessages[this._chatMessages.length - 1].timestamp : 0;
    }
    return this._chatMessages;
  }

  get minScrollHeight(): number {
    let length = this.chatTab ? this.chatTab.chatMessages.length : this.sampleMessages.length;
    return (length < 10000 ? length : 10000) * this.minMessageHeight;
  }

  get topSpace(): number { return this.minScrollHeight - this.bottomSpace; }
  get bottomSpace(): number {
    return 0 < this.chatMessages.length
      ? (this.chatTab.chatMessages.length - this.bottomIndex - 1) * this.minMessageHeight
      : 0;
  }

  private scrollEventShortTimer: ResettableTimeout = null;
  private scrollEventLongTimer: ResettableTimeout = null;
  private addMessageEventTimer: NodeJS.Timer = null;

  private callbackOnScroll: any = () => this.onScroll();
  private callbackOnScrollToBottom: any = () => this.resetMessages();

  @Input() chatTab: ChatTab;
  @Output() onAddMessage: EventEmitter<null> = new EventEmitter();

  constructor(
    private ngZone: NgZone,
    private changeDetector: ChangeDetectorRef,
    private panelService: PanelService
  ) { }

  ngOnInit() {
    let messages: ChatMessage[] = [];
    for (let context of this.sampleMessages) {
      let message = new ChatMessage();
      for (let key in context) {
        if (key === 'identifier') continue;
        if (key === 'tabIdentifier') continue;
        if (key === 'text') {
          message.value = context[key];
          continue;
        }
        if (context[key] == null || context[key] === '') continue;
        message.setAttribute(key, context[key]);
      }
      messages.push(message);
    }
    this.sampleMessages = messages;

    EventSystem.register(this)
      .on('MESSAGE_ADDED', event => {
        let message = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!message || !this.chatTab.contains(message)) return;

        if (this.topTimestamp <= message.timestamp) {
          this.changeDetector.markForCheck();
          this.needUpdate = true;
          this.onMessageInit();
        }
      })
      .on('UPDATE_GAME_OBJECT', event => {
        let message = ObjectStore.instance.get(event.data.identifier);
        if (message && message instanceof ChatMessage
          && this.topTimestamp <= message.timestamp && message.timestamp <= this.botomTimestamp
          && this.chatTab.contains(message)) {
          this.changeDetector.markForCheck();
        }
      });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.scrollEventShortTimer = new ResettableTimeout(() => this.lazyScrollUpdate(), 33);
      this.scrollEventLongTimer = new ResettableTimeout(() => this.lazyScrollUpdate(false), 66);
      this.onScroll();
      this.panelService.scrollablePanel.addEventListener('scroll', this.callbackOnScroll, false);
      this.panelService.scrollablePanel.addEventListener('scrolltobottom', this.callbackOnScrollToBottom, false);
    });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.panelService.scrollablePanel.removeEventListener('scroll', this.callbackOnScroll, false);
    this.panelService.scrollablePanel.removeEventListener('scrolltobottom', this.callbackOnScrollToBottom, false);
    this.scrollEventShortTimer.clear();
    this.scrollEventLongTimer.clear();
    if (this.addMessageEventTimer) clearTimeout(this.addMessageEventTimer);
    this.addMessageEventTimer = null;
  }

  ngOnChanges() {
    Promise.resolve().then(() => this.resetMessages());
  }

  ngAfterViewChecked() {
    if (!this.topElm || !this.bottomElm) return;
    this.ngZone.runOutsideAngular(() => {
      Promise.resolve().then(() => this.adjustScrollPosition());
    });
  }

  onMessageInit() {
    if (this.addMessageEventTimer != null) return;
    this.ngZone.runOutsideAngular(() => {
      this.addMessageEventTimer = setTimeout(() => {
        this.addMessageEventTimer = null;
        this.ngZone.run(() => this.onAddMessage.emit());
      }, 0);
    });
  }

  resetMessages() {
    let lastIndex = this.chatTab.chatMessages.length - 1;
    this.topIndex = lastIndex - Math.floor(this.panelService.scrollablePanel.clientHeight / this.minMessageHeight);
    this.bottomIndex = lastIndex;
    this.needUpdate = true;
    this.preScrollTop = -1;
    this.scrollSpeed = 0;
    this.topElm = this.bottomElm = null;
    this.adjustIndex();
    this.changeDetector.markForCheck();
  }

  trackByChatMessage(index: number, message: ChatMessage) {
    return message.identifier;
  }

  private adjustIndex() {
    let chatMessages = this.chatTab ? this.chatTab.chatMessages : [];
    let lastIndex = 0 < chatMessages.length ? chatMessages.length - 1 : 0;

    if (this.topIndex < 0) {
      this.topIndex = 0;
    }
    if (lastIndex < this.bottomIndex) {
      this.bottomIndex = lastIndex;
    }

    if (this.topIndex < 0) this.topIndex = 0;
    if (this.bottomIndex < 0) this.bottomIndex = 0;
    if (lastIndex < this.topIndex) this.topIndex = lastIndex;
    if (lastIndex < this.bottomIndex) this.bottomIndex = lastIndex;
  }

  private getScrollPosition(): ScrollPosition {
    let top = this.panelService.scrollablePanel.scrollTop;
    let clientHeight = this.panelService.scrollablePanel.clientHeight;
    let scrollHeight = this.panelService.scrollablePanel.scrollHeight;
    if (top < 0) top = 0;
    if (scrollHeight - clientHeight < top)
      top = scrollHeight - clientHeight;
    let bottom = top + clientHeight;
    return { top, bottom, clientHeight, scrollHeight };
  }

  private adjustScrollPosition() {
    if (!this.topElm || !this.bottomElm) return;

    let hasTopElm = this.logContainerRef.nativeElement.contains(this.topElm);
    let hasBotomElm = this.logContainerRef.nativeElement.contains(this.bottomElm);

    let { hasTopBlank, hasBotomBlank } = this.checkBlank(hasTopElm, hasBotomElm);

    this.topElm = this.bottomElm = null;

    if (hasTopBlank || hasBotomBlank || (!hasTopElm && !hasBotomElm)) {
      setZeroTimeout(() => this.lazyScrollUpdate());
    }
  }

  private checkBlank(hasTopElm: boolean, hasBotomElm: boolean) {
    let hasTopBlank = !hasTopElm;
    let hasBotomBlank = !hasBotomElm;

    if (!hasTopElm && !hasBotomElm) return { hasTopBlank, hasBotomBlank };

    let elm: HTMLElement = null;
    let prevBox: DOMRect = null;
    let currentBox: DOMRect = null;
    let diff: number = 0;
    if (hasBotomElm) {
      elm = this.bottomElm;
      prevBox = this.bottomElmBox;
    } else if (hasTopElm) {
      elm = this.topElm;
      prevBox = this.topElmBox;
    }
    currentBox = elm.getBoundingClientRect();
    diff = prevBox.top - currentBox.top - this.scrollSpeed;
    if ((!hasTopBlank || !hasBotomBlank) && 0.5 ** 2 < diff ** 2) {
      this.panelService.scrollablePanel.scrollTop -= diff;
    }

    let logBox: DOMRect = this.logContainerRef.nativeElement.getBoundingClientRect();
    let messageBox: DOMRect = this.messageContainerRef.nativeElement.getBoundingClientRect();

    let messageBoxTop = messageBox.top - logBox.top;
    let messageBoxBottom = messageBoxTop + messageBox.height;

    let scrollPosition = this.getScrollPosition();

    hasTopBlank = scrollPosition.top < messageBoxTop;
    hasBotomBlank = messageBoxBottom < scrollPosition.bottom && scrollPosition.bottom < scrollPosition.scrollHeight;

    return { hasTopBlank, hasBotomBlank };
  }

  private markForReadIfNeeded() {
    if (!this.chatTab.hasUnread) return;

    let scrollPosition = this.getScrollPosition();
    if (scrollPosition.scrollHeight <= scrollPosition.bottom + 100) {
      setZeroTimeout(() => {
        this.chatTab.markForRead();
        this.changeDetector.markForCheck();
        this.ngZone.run(() => { });
      });
    }
  }

  private onScroll() {
    this.scrollEventShortTimer.reset();
    if (!this.scrollEventLongTimer.isActive) {
      this.scrollEventLongTimer.reset();
    }
  }

  private lazyScrollUpdate(isNormalUpdate: boolean = true) {
    this.scrollEventShortTimer.stop();
    this.scrollEventLongTimer.stop();

    let chatMessageElements = this.messageContainerRef.nativeElement.querySelectorAll<HTMLElement>('chat-message');

    let messageBoxTop = this.messageContainerRef.nativeElement.offsetTop;
    let messageBoxBottom = messageBoxTop + this.messageContainerRef.nativeElement.clientHeight;

    let preTopIndex = this.topIndex;
    let preBottomIndex = this.bottomIndex;

    let scrollPosition = this.getScrollPosition();
    this.scrollSpeed = scrollPosition.top - this.preScrollTop;
    this.preScrollTop = scrollPosition.top;

    let hasTopBlank = scrollPosition.top < messageBoxTop;
    let hasBotomBlank = messageBoxBottom < scrollPosition.bottom && scrollPosition.bottom < scrollPosition.scrollHeight;

    if (!isNormalUpdate) {
      this.scrollEventShortTimer.reset();
    }

    if (!isNormalUpdate && !hasTopBlank && !hasBotomBlank) {
      return;
    }

    let scrollWideTop = scrollPosition.top - (!isNormalUpdate && hasTopBlank ? 100 : 1200);
    let scrollWideBottom = scrollPosition.bottom + (!isNormalUpdate && hasBotomBlank ? 100 : 1200);

    this.markForReadIfNeeded();
    this.calcItemIndexRange(messageBoxTop, messageBoxBottom, scrollWideTop, scrollWideBottom, scrollPosition, chatMessageElements);

    let isChangedIndex = this.topIndex != preTopIndex || this.bottomIndex != preBottomIndex;
    if (!isChangedIndex) return;

    this.needUpdate = true;

    this.topElm = chatMessageElements[0];
    this.bottomElm = chatMessageElements[chatMessageElements.length - 1];
    this.topElmBox = this.topElm.getBoundingClientRect();
    this.bottomElmBox = this.bottomElm.getBoundingClientRect();

    setZeroTimeout(() => {
      let scrollPosition = this.getScrollPosition();
      this.scrollSpeed = scrollPosition.top - this.preScrollTop;
      this.preScrollTop = scrollPosition.top;
      this.changeDetector.markForCheck();
      this.ngZone.run(() => { });
    });
  }

  private calcElementMaxHeight(chatMessageElements: NodeListOf<HTMLElement>): number {
    let maxHeight = this.minMessageHeight;
    for (let i = chatMessageElements.length - 1; 0 <= i; i--) {
      let height = chatMessageElements[i].clientHeight;
      if (maxHeight < height) maxHeight = height;
    }
    return maxHeight;
  }

  private calcItemIndexRange(messageBoxTop: number, messageBoxBottom: number, scrollWideTop: number, scrollWideBottom: number, scrollPosition: ScrollPosition, chatMessageElements: NodeListOf<HTMLElement>) {
    if (scrollWideTop >= messageBoxBottom || messageBoxTop >= scrollWideBottom) {
      let lastIndex = this.chatTab.chatMessages.length - 1;
      let scrollBottomHeight = scrollPosition.scrollHeight - scrollPosition.top - scrollPosition.clientHeight;

      this.bottomIndex = lastIndex - Math.floor(scrollBottomHeight / this.minMessageHeight);
      this.topIndex = this.bottomIndex - Math.floor(scrollPosition.clientHeight / this.minMessageHeight);

      this.bottomIndex += 1;
      this.topIndex -= 1;
    } else {
      let maxHeight = this.calcElementMaxHeight(chatMessageElements);
      if (scrollWideTop < messageBoxTop) {
        this.topIndex -= Math.floor((messageBoxTop - scrollWideTop) / maxHeight) + 1;
      } else if (scrollWideTop > messageBoxTop) {
        if (!isiOS) this.topIndex += Math.floor((scrollWideTop - messageBoxTop) / maxHeight);
      }

      if (messageBoxBottom > scrollWideBottom) {
        if (!isiOS) this.bottomIndex -= Math.floor((messageBoxBottom - scrollWideBottom) / maxHeight);
      } else if (messageBoxBottom < scrollWideBottom) {
        this.bottomIndex += Math.floor((scrollWideBottom - messageBoxBottom) / maxHeight) + 1;
      }
    }
    this.adjustIndex();
  }
}
