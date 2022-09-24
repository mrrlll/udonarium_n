import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';

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

  get myPeer(): PeerCursor { return PeerCursor.myCursor; }

  get isGMMode(): boolean{ return PeerCursor.myCursor ? PeerCursor.myCursor.isGMMode : false; }
  set isGMMode(isGMMode: boolean) { if (PeerCursor.myCursor) PeerCursor.myCursor.isGMMode = isGMMode; }

  get isGMHold(): boolean { return PeerCursor.isGMHold; }
  get isDisableConnect(): boolean { return this.isGMHold || this.isGMMode; }

  constructor(
    private ngZone: NgZone,
    private modalService: ModalService,
    private panelService: PanelService,
    private chatMessageService: ChatMessageService,
    public appConfigService: AppConfigService
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.panelService.title = '接続情報');
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

  copyUserIdToClipboard() {
    var userId = document.querySelector("#userId").textContent;
    navigator.clipboard.writeText(userId)
      .then(
        () => { },
        (err) => {
          console.error("Failed to copy userId: ", err);
        });
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
}
