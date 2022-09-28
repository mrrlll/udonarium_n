import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';

import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PeerContext } from '@udonarium/core/system/network/peer-context';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerCursor } from '@udonarium/peer-cursor';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { LobbyComponent } from 'component/lobby/lobby.component';
import { AppConfigService } from 'service/app-config.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { ChatMessageService } from 'service/chat-message.service';
import { ConfirmationComponent, ConfirmationType } from 'component/confirmation/confirmation.component';
import { GameCharacter } from '@udonarium/game-character';
import { AppConfigCustomService } from 'service/app-config-custom.service';

@Component({
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  styleUrls: ['./peer-menu.component.css']
})
export class PeerMenuComponent implements OnInit, OnDestroy, AfterViewInit {

  targetUserId: string = '';
  networkService = Network
  gameRoomService = ObjectStore.instance;
  help: string = '';

  @Input() isViewer: boolean = false;

  get myPeer(): PeerCursor { return PeerCursor.myCursor; }

  set myPeerName(name: string) {
    if (window.localStorage) {
      localStorage.setItem(PeerCursor.CHAT_MY_NAME_LOCAL_STORAGE_KEY, name);
    }
    if (PeerCursor.myCursor) PeerCursor.myCursor.name = name;
  }

  get myPeerColor(): string {
    if (!PeerCursor.myCursor) return PeerCursor.CHAT_DEFAULT_COLOR;
    return PeerCursor.myCursor.color;
  }
  set myPeerColor(color: string) {
    if (PeerCursor.myCursor) {
      PeerCursor.myCursor.color = (color == PeerCursor.CHAT_TRANSPARENT_COLOR) ? PeerCursor.CHAT_DEFAULT_COLOR : color;
    }
    if (window.localStorage) {
      localStorage.setItem(PeerCursor.CHAT_MY_COLOR_LOCAL_STORAGE_KEY, PeerCursor.myCursor.color);
    }
  }

  get isGMMode(): boolean{ return PeerCursor.myCursor ? PeerCursor.myCursor.isGMMode : false; }
  set isGMMode(isGMMode: boolean) { if (PeerCursor.myCursor) PeerCursor.myCursor.isGMMode = isGMMode; }

  get isGMHold(): boolean { return PeerCursor.isGMHold; }
  get isDisableConnect(): boolean { return this.isGMHold || this.isGMMode; }

  constructor(
    private ngZone: NgZone,
    private modalService: ModalService,
    private panelService: PanelService,
    private chatMessageService: ChatMessageService,
    public appConfigService: AppConfigService,
    private appCustomService: AppConfigCustomService
  ) { }


  ngOnInit() {
    this.isViewer = this.appCustomService.dataViewer;
    Promise.resolve().then(() => {this.panelService.title = '接続情報'; this.panelService.isAbleFullScreenButton = false});
    Promise.resolve().then(() => {console.log;});
  }

  ngAfterViewInit() {
    EventSystem.register(this)
      .on('OPEN_NETWORK', event => {
        this.ngZone.run(() => { });
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  changeIcon() {
    this.modalService.open<string>(FileSelecterComponent).then(value => {
      if (!this.myPeer || !value) return;
      this.myPeer.imageIdentifier = value;
    });
  }

  private changeGMModeName() {
    if (!this.myPeer || !this.myPeer.name) {
      return;
    }
    if (this.isViewer) {
      if (this.myPeer.name.match(/^👁.*/)) {
        return;
      } else {
        this.myPeer.name = '👁' + this.myPeer.name;
      }
    } else {
      if (this.myPeer.name.match(/^👁.*/)) {
        this.myPeer.name = this.myPeer.name.replace('👁', '');
      }
    }
  }

  connectPeer() {
    let targetUserId = this.targetUserId;
    this.targetUserId = '';
    if (targetUserId.length < 1) return;
    this.help = '';
    let context = PeerContext.create(targetUserId);
    if (context.isRoom) return;
    ObjectStore.instance.clearDeleteHistory();
    Network.connect(context.peerId);
  }

  showLobby() {
    this.modalService.open(LobbyComponent, { width: 700, height: 400, left: 0, top: 400 });
  }

  findUserId(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.userId : '';
  }

  findPeerName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.name : '';
  }

  findPeerIsGMMode(peerId: string): boolean {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.isGMMode : false;
  }

  output() {
    this.appCustomService.isViewer.next(this.isViewer);
    this.appCustomService.dataViewer = this.isViewer;
    this.changeGMModeName();
    if (this.isViewer) {
      this.chatMessageService.sendOperationLog('GM&観戦モードを解除しました。');
    }
    else {
      this.chatMessageService.sendOperationLog('GM&観戦モードになりました。');
    }
  }

  onGMMode($event: Event) {
    if (PeerCursor.isGMHold || this.isGMMode) {
      if (this.isGMMode) {
        $event.preventDefault();
        this.modalService.open(ConfirmationComponent, {
          title: 'GMモード解除',
          text: 'GMモードを解除しますか？',
          type: ConfirmationType.OK_CANCEL,
          materialIcon: 'person_remove',
          action: () => {
            PeerCursor.isGMHold = false;
            this.isGMMode = false;
            (<HTMLInputElement>$event.target).checked = false;
            this.chatMessageService.sendOperationLog('GMモードを解除');
            EventSystem.trigger('CHANGE_GM_MODE', null);
            //this.changeDetector.markForCheck();
            if (GameCharacter.isStealthMode) {
              this.modalService.open(ConfirmationComponent, {
                title: 'ステルスモード',
                text: 'ステルスモードになります。',
                help: '位置を自分だけ見ているキャラクターが1つ以上テーブル上にある間、あなたのカーソル位置は他の参加者に伝わりません。',
                type: ConfirmationType.OK,
                materialIcon: 'disabled_visible'
              });
            }
          }
        });
      } else {
        PeerCursor.isGMHold = false;
        this.isGMMode = false;
      }
    } else {
      $event.preventDefault();
      this.modalService.open(ConfirmationComponent, {
        title: 'GMモードになる',
        text: 'GMモードになりますか？\nGMモード中（保留中含む）はあなたからプライベート接続、ルームへの接続は行えません。',
        helpHtml: 'GMモードでは、<b>秘話</b>、裏向きの<b>カード</b>、公開されていない<b>ダイスシンボル</b>、<b>キャラクター</b>位置、<b>カーソル</b>位置をすべて見ることができ、あなたのカーソル位置は他の参加者に伝わらなくなります。\n\n<b><big>—With great power comes great responsibility.</big></b>',
        type: ConfirmationType.OK_CANCEL,
        materialIcon: 'person_add',
        action: () => {
          PeerCursor.isGMHold = true;
          this.isGMMode = false;
          (<HTMLInputElement>$event.target).checked = true;
          //this.changeDetector.markForCheck();
          this.modalService.open(ConfirmationComponent, {
            title: 'GMモードになる',
            text: 'まだGMモードではありません。',
            helpHtml: 'GMモードになるには、チャットから <b>GMになる</b> または <b>GMになります</b> を含む文を送信します。',
            type: ConfirmationType.OK,
            materialIcon: 'person_add'
          });
        }
      });
    }
  }

  getUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    url.searchParams.append('id', this.networkService.peerContext.userId);
    navigator.clipboard.writeText(url.href);

    document.getElementById('geturlbtn').textContent = "コピーしました";
    setTimeout(function(){
      document.getElementById('geturlbtn').textContent = '接続URL取得';
    },
    2000
  )};
}
