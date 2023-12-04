import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChatPalette } from '@udonarium/chat-palette';
import { ChatTab } from '@udonarium/chat-tab';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem } from '@udonarium/core/system';
import { StringUtil } from '@udonarium/core/system/util/string-util';
import { DiceBot } from '@udonarium/dice-bot';
import { GameCharacter } from '@udonarium/game-character';
import { PeerCursor } from '@udonarium/peer-cursor';
import { ChatInputComponent } from 'component/chat-input/chat-input.component';
import { ChatMessageService } from 'service/chat-message.service';
import { PanelService } from 'service/panel.service';

@Component({
  selector: 'chat-palette',
  templateUrl: './chat-palette.component.html',
  styleUrls: ['./chat-palette.component.css']
})
export class ChatPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('chatInput', { static: true }) chatInputComponent: ChatInputComponent;
  @ViewChild('chatPalette') chatPaletteElementRef: ElementRef<HTMLSelectElement>;
  @Input() character: GameCharacter = null;

  get palette(): ChatPalette { return this.character.chatPalette; }

  private _gameType: string = '';
  get gameType(): string { return !this._gameType ? 'DiceBot' : this._gameType; };
  set gameType(gameType: string) {
    this._gameType = gameType;
    if (this.character.chatPalette) this.character.chatPalette.dicebot = gameType;
  };

  get sendFrom(): string { return this.character.identifier; }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  chatTabidentifier: string = '';
  text: string = '';
  sendTo: string = '';

  isEdit: boolean = false;
  editPalette: string = '';

  filterText: string = '';

  private doubleClickTimer: NodeJS.Timer = null;

  get diceBotInfos() { return DiceBot.diceBotInfos }

  get chatTab(): ChatTab { return ObjectStore.instance.get<ChatTab>(this.chatTabidentifier); }
  get myPeer(): PeerCursor { return PeerCursor.myCursor; }
  get otherPeers(): PeerCursor[] { return ObjectStore.instance.getObjects(PeerCursor); }

  constructor(
    public chatMessageService: ChatMessageService,
    private panelService: PanelService
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.updatePanelTitle());
    this.chatTabidentifier = this.chatMessageService.chatTabs ? this.chatMessageService.chatTabs[0].identifier : '';
    this.gameType = this.character.chatPalette ? this.character.chatPalette.dicebot : '';
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', -1000, event => {
        if (this.character && this.character.identifier === event.data.identifier) {
          this.panelService.close();
        }
        if (this.chatTabidentifier === event.data.identifier) {
          this.chatTabidentifier = this.chatMessageService.chatTabs ? this.chatMessageService.chatTabs[0].identifier : '';
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.isEdit) this.toggleEditMode();
  }

  updatePanelTitle() {
    this.panelService.title = this.character.name + ' のチャットパレット';
  }

  onSelectedCharacter(identifier: string) {
    if (this.isEdit) this.toggleEditMode();
    let object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      this.character = object;
      let gameType = this.character.chatPalette ? this.character.chatPalette.dicebot : '';
      if (0 < gameType.length) this.gameType = gameType;
    }
    this.updatePanelTitle();
  }

  selectPalette(line: string) {
    // this.text = line;
    let multiLine = line.replace(/\\n/g, '\n');
    this.text = multiLine;
    this.chatInputComponent.kickCalcFitHeight();
  }

  clickPalette(line: string) {
    // if (this.doubleClickTimer && this.text === line) {
    let multiLine = line.replace(/\\n/g, '\n');
    if (this.doubleClickTimer && this.text === multiLine) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
      this.chatInputComponent.sendChat(null);
    } else {
      // this.text = line;
      this.text = multiLine;
      this.chatInputComponent.kickCalcFitHeight();
      this.doubleClickTimer = setTimeout(() => { this.doubleClickTimer = null }, 400);
    }
  }

  sendChat(value: { text: string, gameType: string, sendFrom: string, sendTo: string }) {
    if (this.chatTab) {
      let text = this.palette.evaluate(value.text, this.character.rootDataElement);
      this.chatMessageService.sendMessage(this.chatTab, text, value.gameType, value.sendFrom, value.sendTo);
    }
  }

  resetPaletteSelect() {
    if (!this.chatPaletteElementRef.nativeElement) return;
    this.chatPaletteElementRef.nativeElement.selectedIndex = -1;
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
    if (this.isEdit) {
      this.editPalette = this.palette.value + '';
    } else {
      this.palette.setPalette(this.editPalette);
    }
  }

  filter(value: string): boolean {
    if (this.filterText == null || this.filterText.trim() == '') return true;
    return StringUtil.toHalfWidth(value.replace(/[―ー—‐]/g, '-')).replace(/[\r\n\s]+/, ' ').trim().indexOf(StringUtil.toHalfWidth(this.filterText.replace(/[―ー—‐]/g, '-')).replace(/[\r\n\s]+/, ' ').trim()) >= 0;
  }

  chatTabSwitchRelative(direction: number) {
    let chatTabs = this.chatMessageService.chatTabs;
    let index = chatTabs.findIndex((elm) => elm.identifier == this.chatTabidentifier);
    if (index < 0) { return; }

    let nextIndex: number;
    if (index == chatTabs.length - 1 && direction == 1) {
      nextIndex = 0;
    } else if (index == 0 && direction == -1) {
      nextIndex = chatTabs.length - 1;
    } else {
      nextIndex = index + direction;
    }
    this.chatTabidentifier = chatTabs[nextIndex].identifier;
  }
}
