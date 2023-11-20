import { ImageFile } from './core/file-storage/image-file';
import { ImageStorage } from './core/file-storage/image-storage';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { ObjectNode } from './core/synchronize-object/object-node';
import { Network } from './core/system';
import { StringUtil } from './core/system/util/string-util';
import { Autolinker } from 'autolinker';
import { PeerCursor } from './peer-cursor';
import { formatDate } from '@angular/common';

import { ChatTabList } from '@udonarium/chat-tab-list';
import { ObjectStore } from './core/synchronize-object/object-store';

export interface ChatMessageContext {
  identifier?: string;
  tabIdentifier?: string;
  originFrom?: string;
  from?: string;
  to?: string;
  toName?: string;
  color?: string;
  toColor?: string;
  name?: string;
  text?: string;
  timestamp?: number;
  tag?: string;
  dicebot?: string;
  imageIdentifier?: string;

  imagePos?: number;
  messColor?: string;
  sendFrom?: string;
}

@SyncObject('chat')
export class ChatMessage extends ObjectNode implements ChatMessageContext {
  @SyncVar() originFrom: string;
  @SyncVar() from: string;
  @SyncVar() to: string;
  @SyncVar() toName: string = '';
  @SyncVar() name: string;
  @SyncVar() tag: string;
  @SyncVar() dicebot: string;
  @SyncVar() imageIdentifier: string;
  @SyncVar() imagePos: number;
  @SyncVar() messColor: string;
  @SyncVar() sendFrom: string;
  @SyncVar() lastUpdate: number = 0
  @SyncVar() color: string;
  @SyncVar() toColor: string = '';

  get tabIdentifier(): string { return this.parent.identifier; }
  get text(): string { return <string>this.value }
  set text(text: string) { this.value = (text == null) ? '' : text; }
  get timestamp(): number {
    let timestamp = this.getAttribute('timestamp');
    let num = timestamp ? +timestamp : 0;
    return Number.isNaN(num) ? 1 : num;
  }
  private _to: string;
  private _sendTo: string[] = [];
  get sendTo(): string[] {
    if (this._to !== this.to) {
      this._to = this.to;
      this._sendTo = this.to != null && 0 < this.to.trim().length ? this.to.trim().split(/\s+/) : [];
    }
    return this._sendTo;
  }

  get isEdited(): boolean {
    return this.lastUpdate > 0;
  }

  private _tag: string;
  private _tags: string[] = [];
  get tags(): string[] {
    if (this._tag !== this.tag) {
      this._tag = this.tag;
      this._tags = this.tag != null && 0 < this.tag.trim().length ? this.tag.trim().split(/\s+/) : [];
    }
    return this._tags;
  }
  get image(): ImageFile { return ImageStorage.instance.get(this.imageIdentifier); }
  get index(): number { return this.minorIndex + this.timestamp; }
  get isDirect(): boolean { return 0 < this.sendTo.length ? true : false; }
  get isSendFromSelf(): boolean { return this.from === Network.peer.userId || this.originFrom === Network.peer.userId; }
  get isRelatedToMe(): boolean { return (-1 < this.sendTo.indexOf(Network.peer.userId)) || this.isSendFromSelf ? true : false; }
  get isDisplayable(): boolean { return this.isDirect ? this.isRelatedToMe : true; }
  get isSystem(): boolean { return -1 < this.tags.indexOf('system') ? true : false; }
  get isDicebot(): boolean { return this.isSystem && this.from === 'System-BCDice' ? true : false; }
  get isCalculate(): boolean { return this.isSystem && this.from.indexOf('Dice') >= 0 && /^C\(.+\) →/i.test(this.text); }
  get isSpecialColor(): boolean { return this.isDirect || this.isSecret || this.isSystem || this.isOperationLog || this.isDicebot || this.isCalculate; }
  get isSecret(): boolean { return -1 < this.tags.indexOf('secret') ? true : false; }
  get isEditable(): boolean { return !this.isSystem && !this.isOperationLog && this.from === Network.peer.userId }
  get isSuccess(): boolean { return this.isDicebot && -1 < this.tags.indexOf('success'); }
  get isFailure(): boolean { return this.isDicebot && -1 < this.tags.indexOf('failure'); }
  get isCritical(): boolean { return this.isDicebot && -1 < this.tags.indexOf('critical'); }
  get isFumble(): boolean { return this.isDicebot && -1 < this.tags.indexOf('fumble'); }
  get isGMMode(): boolean{ return PeerCursor.myCursor ? PeerCursor.myCursor.isGMMode : false; }
  get isOperationLog(): boolean { return -1 < this.tags.indexOf('opelog') ? true : false; }

  private locale = 'en-US';

  logFragment(logForamt: number, tabName: string=null, dateFormat='HH:mm', noImage=true) {
    if (logForamt == 0) {
      return this.logFragmentText(tabName, dateFormat);
    } else {
      return this.logFragmentHtml(tabName, dateFormat, logForamt != 2);
    }
  }

  logFragmentText(tabName: string=null, dateFormat='HH:mm'): string {
    tabName = (!tabName || tabName.trim() == '') ? '' : `[${ tabName }] `;
    const dateStr = (dateFormat == '') ? '' : formatDate(new Date(this.timestamp), dateFormat, this.locale) + '：';
    const lastUpdateStr = !this.isEdited ? '' :
      (dateFormat == '') ? ' (編集済)' : ` (編集済 ${ formatDate(new Date(this.lastUpdate), dateFormat, this.locale) })`;
    let text = StringUtil.rubyToText(this.text);
    if (this.isDicebot) text = text.replace(/###(.+?)###/g, '*$1').replace(/\~\~\~(.+?)\~\~\~/g, '~$1');
    if (text.lastIndexOf('\n') == text.length - 1 && !lastUpdateStr) {
      // 最終行の調整
      text += "\n";
    }
    return `${ tabName }${ dateStr }${ this.name }${ this.toColor ? (' ➡ ' + this.toName) : '' }：${ (this.isSecret && !this.isSendFromSelf) ? '（シークレットダイス）' : text + lastUpdateStr }`
  }

  logFragmentHtml(tabName: string=null, dateFormat='HH:mm', noImage=true): string {
    const color = StringUtil.escapeHtml(this.color ? this.color : PeerCursor.CHAT_DEFAULT_COLOR);
    const colorStyle = ` style="color: ${ color }"`;

    const toColor = this.toColor ? StringUtil.escapeHtml(this.toColor) : '';
    const toColorStyle = this.toColor ? ` style="color: ${ toColor }"`: '';

    const growClass = (this.isDirect || this.isSecret) ? ' class="grow"' : '';

    const tabNameHtml = (!tabName || tabName.trim() == '') ? '' : `<span class="tab-name">${ StringUtil.escapeHtml(tabName) }</span> `;
    const date = new Date(this.timestamp);
    const dateHtml = (dateFormat == '') ? '' : `<time datetime="${ date.toISOString() }">${ StringUtil.escapeHtml(formatDate(date, dateFormat, this.locale)) }</time>：`;
    const nameHtml = `<span${growClass}${colorStyle}>${StringUtil.escapeHtml(this.name)}</span>`
      + (this.toColor ? ` ➡ <span${growClass}${toColorStyle}>${StringUtil.escapeHtml(this.toName)}</span>` : '');

    let messageClassNames = ['message'];
    if (this.isDirect || this.isSecret) messageClassNames.push('direct-message');
    if (this.isSystem) messageClassNames.push('system-message');
    if (this.isDicebot || this.isCalculate) messageClassNames.push('dicebot-message');
    if (this.isOperationLog) messageClassNames.push('operation-log');

    let messageTextClassNames = ['msg-text'];
    if (this.isSuccess) messageTextClassNames.push('is-success');
    if (this.isFailure) messageTextClassNames.push('is-failure');
    if (this.isCritical) messageTextClassNames.push('is-critical');
    if (this.isFumble) messageTextClassNames.push('is-fumble');

    let textAutoLinkedHtml = (this.isSecret && !this.isSendFromSelf) ? '<s>（シークレットダイス）</s>'
      : Autolinker.link(this.isOperationLog ? StringUtil.escapeHtml(this.text) : StringUtil.rubyToHtml(StringUtil.escapeHtml(this.text)), {
        urls: {schemeMatches: true, tldMatches: false},
        truncate: {length: 96, location: 'end'},
        decodePercentEncoding: false,
        stripPrefix: false,
        stripTrailingSlash: false,
        email: false,
        phone: false,
        className: 'outer-link',
        replaceFn : function(m) {
          return m.getType() == 'url' && StringUtil.validUrl(m.getAnchorHref());
        }
      });
      if (this.isDicebot) textAutoLinkedHtml = ChatMessage.decorationDiceResult(textAutoLinkedHtml);

      let lastUpdateHtml = '';
      if (this.isEdited) {
        if (dateFormat == '') {
          lastUpdateHtml = '<span class="is-edited">編集済</span>';
        } else {
          const lastUpdate = new Date(this.lastUpdate);
          lastUpdateHtml = `<span class="is-edited"><b>編集済</b> <time datetime="${ lastUpdate.toISOString() }">${ StringUtil.escapeHtml(formatDate(lastUpdate, dateFormat, this.locale)) }</time></span>`;
        }
      }

      if (textAutoLinkedHtml.lastIndexOf('\n') == textAutoLinkedHtml.length - 1 && !lastUpdateHtml) {
        // 最終行の調整
        textAutoLinkedHtml += "\n";
      }
      return `<div class="${ messageClassNames.join(' ') }" style="border-left-color: ${ color }">
  <div class="msg-header">${ tabNameHtml }${ dateHtml }<span class="msg-name">${ nameHtml }</span>：</div>
  <div class="${ messageTextClassNames.join(' ') }"><span${ this.isSpecialColor ? '' : colorStyle }>${ textAutoLinkedHtml }</span>${ lastUpdateHtml }</div>
</div>`;
  }

  static decorationDiceResult(diceBotMessage: string) :string {
    return diceBotMessage
      .replace(/###(.+?)###/g, '<b class="special-dice">$1</b>')
      .replace(/\~\~\~(.+?)\~\~\~/g, '<s class="drop-dice"><span class="dropped">$1</span></s>')
  }
}
