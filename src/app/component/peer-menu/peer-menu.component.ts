import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';

import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerContext } from '@udonarium/core/system/network/peer-context';
import { PeerSessionGrade } from '@udonarium/core/system/network/peer-session-state';
import { PeerCursor } from '@udonarium/peer-cursor';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { LobbyComponent } from 'component/lobby/lobby.component';
import { AppConfigService } from 'service/app-config.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { ChatMessageService } from 'service/chat-message.service';
import { AppConfigCustomService } from 'service/app-config-custom.service';
import { RoomSetting } from '@udonarium/room-setting';

@Component({
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  styleUrls: ['./peer-menu.component.css']
})
export class PeerMenuComponent implements OnInit, OnDestroy, AfterViewInit {

  targetUserId: string = '';
  networkService = Network;
  help: string = '';
  isPasswordVisible = false;

  @Input() isViewer: boolean = false;

  roomSetting: RoomSetting;

  private interval: NodeJS.Timeout;
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  get isPeerWindowAble(): boolean {
    return this.roomSetting.peerMenuAuthority;
  }
  set isPeerWindowAble(checkbox: boolean) {
    this.roomSetting.peerMenuAuthority = checkbox;
  }
  get isChatWindowAble(): boolean {
    return this.roomSetting.chatWindowAuthority;
  }
  set isChatWindowAble(checkbox: boolean) {
    this.roomSetting.chatWindowAuthority = checkbox;
  }
  get isGameTableSettingAble(): boolean {
    return this.roomSetting.gameTableSettingAuthority;
  }
  set isGameTableSettingAble(checkbox: boolean) {
    this.roomSetting.gameTableSettingAuthority = checkbox;
  }
  get isFileStorageAble(): boolean {
    return this.roomSetting.fileStorageAuthority;
  }
  set isFileStorageAble(checkbox: boolean) {
    this.roomSetting.fileStorageAuthority = checkbox;
  }

  get isJukeboxAble(): boolean {
    return this.roomSetting.jukeboxAuthority;
  }
  set isJukeboxAble(checkbox: boolean) {
    this.roomSetting.jukeboxAuthority = checkbox;
  }
  get isCutinAble(): boolean {
    return this.roomSetting.cutinAuthority;
  }
  set isCutinAble(checkbox: boolean) {
    this.roomSetting.cutinAuthority = checkbox;
  }
  get isGameObjectInventoryAble(): boolean {
    return this.roomSetting.gameObjectInventoryAuthority;
  }
  set isGameObjectInventoryAble(checkbox: boolean) {
    this.roomSetting.gameObjectInventoryAuthority = checkbox;
  }
  get isFileSelectAble(): boolean {
    return this.roomSetting.fileSelectAuthority;
  }
  set isFileSelectAble(checkbox: boolean) {
    this.roomSetting.fileSelectAuthority = checkbox;
  }

  get isFileSaveAble(): boolean {
    return this.roomSetting.fileSaveAuthority;
  }
  set isFileSaveAble(checkbox: boolean) {
    this.roomSetting.fileSaveAuthority = checkbox;
  }

  get isTimerAble(): boolean {
    return this.roomSetting.timerAuthority;
  }
  set isTimerAble(checkbox: boolean) {
    this.roomSetting.timerAuthority = checkbox;
  }

  get isGamePanelSettingAble(): boolean {
    return this.roomSetting.gamePanelSettingAuthority;
  }

  set isGamePanelSettingAble(checkbox: boolean) {
    this.roomSetting.gamePanelSettingAuthority = checkbox;
  }

  get myPeerName(): string {
    if (!PeerCursor.myCursor) return null;
    return PeerCursor.myCursor.name;
  }

  set myPeerName(name: string) {
    if (window.localStorage) {
      localStorage.setItem(PeerCursor.CHAT_MY_NAME_LOCAL_STORAGE_KEY, name);
    }
    if (PeerCursor.myCursor) PeerCursor.myCursor.name = name;
  }

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
    this.roomSetting = ObjectStore.instance.get<RoomSetting>('room-setting');
    Promise.resolve().then(() => {this.panelService.title = '接続情報'; this.panelService.isAbleFullScreenButton = false});
  }

  ngAfterViewInit() {
    EventSystem.register(this)
      .on('OPEN_NETWORK', event => {
        this.ngZone.run(() => { });
      });
    this.interval = setInterval(() => { }, 1000);

    // 自動GMモード　テストの時用に使用
    if(location.href.match(/localhost/) || location.href.match(/192.168/)) {
      setTimeout(() => {
        this.autoGMMode();
      }, 1000);
    }
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    clearInterval(this.interval);
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
    let peer = PeerContext.create(targetUserId);
    if (peer.isRoom) return;
    ObjectStore.instance.clearDeleteHistory();
    Network.connect(peer);
  }

  autoGMMode() {
    if (this.networkService.peers.length === 0) {
      this.isViewer = true;
      this.output();
    }
  }

  showLobby() {
    this.modalService.open(LobbyComponent, { width: 700, height: 400, left: 0, top: 400 });
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  stringFromSessionGrade(grade: PeerSessionGrade): string {
    return PeerSessionGrade[grade] ?? PeerSessionGrade[PeerSessionGrade.UNSPECIFIED];
  }

  findUserId(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.userId : '';
  }

  findPeerName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.name : '';
  }

  output() {
    this.appCustomService.isViewer.next(this.isViewer);
    this.appCustomService.dataViewer = this.isViewer;
    this.changeGMModeName();
    if (!this.isViewer) {
      this.chatMessageService.sendOperationLog('GM＆観戦モードを解除しました。');
    }
    else {
      this.chatMessageService.sendOperationLog('GM＆観戦モードを有効にしました。');
    }
  }

  getUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    url.searchParams.append('id', this.networkService.peer.userId);
    navigator.clipboard.writeText(url.href);

    document.getElementById('geturlbtn').textContent = "コピーしました";
    setTimeout(function(){
      document.getElementById('geturlbtn').textContent = '接続URL取得';
    },
    2000
  )};
}
