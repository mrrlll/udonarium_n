import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

import { ChatMessage } from '@udonarium/chat-message';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ChatMessageService } from 'service/chat-message.service';

import { StringUtil } from '@udonarium/core/system/util/string-util';
import { ModalService } from 'service/modal.service';
import { OpenUrlComponent } from 'component/open-url/open-url.component';
import { EventSystem } from '@udonarium/core/system';

import { ChatTabList } from '@udonarium/chat-tab-list';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';

import { COMPOSITION_BUFFER_MODE } from '@angular/forms'
import Autolinker from 'autolinker';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css'],
  animations: [
    trigger('flyInOut', [
      transition('* => active', [
        animate('200ms ease-out', keyframes([
          style({ transform: 'translateX(100px)', opacity: '0', offset: 0 }),
          style({ transform: 'translateX(0)', opacity: '1', offset: 1.0 })
        ]))
      ]),
      transition('void => *', [
        animate('200ms ease-out', keyframes([
          style({ opacity: '0', offset: 0 }),
          style({ opacity: '1', offset: 1.0 })
        ]))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.Default
})

export class ChatMessageComponent implements OnInit {
  @Input() chatMessage: ChatMessage;
  @Input() compact: boolean = false;
  @Input() simpleDispFlagTime: boolean = false;
  @Input() simpleDispFlagUserId: boolean = false;
  @Input() chatSimpleDispFlag: boolean = false;
  @ViewChild('edit', { static: false }) editElm: ElementRef<HTMLTextAreaElement>;
  isEditing = false;
  imageFile: ImageFile = ImageFile.Empty;
  animeState: string = 'inactive';
  editingText = '';

  get chatTabList(): ChatTabList { return ObjectStore.instance.get<ChatTabList>('ChatTabList'); }

  constructor(
    private chatMessageService: ChatMessageService,
    private modalService: ModalService,
  ) { }

  ngOnInit() {
    let file: ImageFile = this.chatMessage.image;
    if (file) this.imageFile = file;
    let time = this.chatMessageService.getTime();
    if (time - 10 * 1000 < this.chatMessage.timestamp) this.animeState = 'active';
  }

  get isMine(): boolean {
    return this.chatMessage.isSendFromSelf;
  }

  get isEditable(): boolean {
    return this.chatMessage.isEditable;
  }

  get isCompact(): boolean {
    return this.compact || this.chatMessage.isOperationLog;
    //return this.compact || this.chatMessage.isOperationLog || this.chatMessage.isDicebot;
  }

  discloseMessage() {
    this.chatMessage.tag = this.chatMessage.tag.replace('secret', '');
  }

  editStart() {
    EventSystem.trigger('MESSAGE_EDITING_START', { messageIdentifier: this.chatMessage.identifier });
    this.editingText = this.chatMessage.text;
    this.isEditing = true;
    setTimeout(() => {
      if (this.editElm.nativeElement) this.editElm.nativeElement.focus();
    });
  }

  escapeHtmlAndRuby(text) {
    // ルビ機能 ハーメルン記法を参考 半角全角|始まり。振られる側にスペースは不可。
    // 記入例：|永遠力暴風雪《エターナルフォースブリザード》
    // 振られる側に《スキル名》は有効：|《約束された勝利の剣》《エクスカリバー》
    let escapeText = this.escapeHtml(text);
    return escapeText.replace(/[\|｜]([^\|｜\s]+?)《(.+?)》/g, '<ruby style="white-space:normal;">$1<rt>$2</rt></ruby>').replace(/\\s/g,' ');
  }

  editEnd(event: KeyboardEvent=null) {
    if (event) event.preventDefault();
    if (event && event.keyCode !== 13) return;

    if (this.isEditable && this.editingText.trim().length > 0 && this.chatMessage.text != this.editingText) {
      if (!this.chatMessage.isSecret) this.chatMessage.lastUpdate = Date.now();
      this.chatMessage.text = this.editingText;
      this.isEditing = false;
    } else {
      this.editCancel();
    }
  }

  editCancel() {
    this.isEditing = false;
  }

  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  get htmlEscapedFrom():string  {
    return this._htmlEscapeLinking(this.chatMessage.from, true);
  }

  get htmlEscapedText():string  {
    let text = this._htmlEscapeLinking(this.chatMessage.text, false, !this.chatMessage.isOperationLog);
    if (this.chatMessage.isDicebot) text = ChatMessage.decorationDiceResult(text);
    return text;
  }

  private _htmlEscapeLinking(str, shorten=false, ruby=false): string {
    str = StringUtil.escapeHtml(str);
    if (ruby) str = StringUtil.rubyToHtml(str);
    return Autolinker.link(this.lastNewLineAdjust(str), {
      urls: {schemeMatches: true, tldMatches: false},
      truncate: {length: 48, location: 'end'},
      decodePercentEncoding: shorten,
      stripPrefix: shorten,
      stripTrailingSlash: shorten,
      email: false,
      phone: false,
      replaceFn : function(m) {
        if (m.getType() == 'url' && StringUtil.validUrl(m.getAnchorHref())) {
          if (StringUtil.sameOrigin(m.getAnchorHref())) {
            return true;
          } else {
            const tag = m.buildTag();
            tag.setAttr('rel', 'nofollow');
            tag.addClass('outer-link');
            return tag;
          }
        }
        return false;
      }
    });
  }

  lastNewLineAdjust(str: string): string {
    if (str == null) return '';
    return ((this.isEditing || !(this.chatMessage.isEdited || this.chatMessage.isSecret)) && str.lastIndexOf("\n") == str.length - 1) ? str + "\n" : str;
  }

  onLinkClick($event) {
    //console.log($event.target.tagName);
    if ($event && $event.target.tagName == 'A') {
      const href = $event.target.getAttribute('href');
      if (!StringUtil.sameOrigin(href)) {
        $event.preventDefault();
        this.modalService.open(OpenUrlComponent, { url: $event.target.getAttribute('href') });
        return false;
      }
    }
    return true;
  }
}
