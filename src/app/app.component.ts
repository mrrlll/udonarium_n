import { AfterViewInit, Component, NgZone, OnDestroy, ViewChild, ViewContainerRef, Input } from '@angular/core';
import { NgSelectConfig } from '@ng-select/ng-select';
import { ChatTabList } from '@udonarium/chat-tab-list';
import { Config } from '@udonarium/config';
import { AudioPlayer } from '@udonarium/core/file-storage/audio-player';
import { AudioSharingSystem } from '@udonarium/core/file-storage/audio-sharing-system';
import { AudioStorage } from '@udonarium/core/file-storage/audio-storage';
import { FileArchiver } from '@udonarium/core/file-storage/file-archiver';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ImageSharingSystem } from '@udonarium/core/file-storage/image-sharing-system';
import { ImageStorage } from '@udonarium/core/file-storage/image-storage';
import { ObjectFactory } from '@udonarium/core/synchronize-object/object-factory';
import { ObjectSerializer } from '@udonarium/core/synchronize-object/object-serializer';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { ObjectSynchronizer } from '@udonarium/core/synchronize-object/object-synchronizer';
import { EventSystem, Network } from '@udonarium/core/system';
import { DataSummarySetting } from '@udonarium/data-summary-setting';
import { DiceBot } from '@udonarium/dice-bot';
import { Jukebox } from '@udonarium/Jukebox';
import { PeerCursor } from '@udonarium/peer-cursor';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TableSelecter } from '@udonarium/table-selecter';
import { CutIn } from '@udonarium/cut-in';
import { CutInLauncher } from '@udonarium/cut-in-launcher';

import { CutInWindowComponent } from 'component/cut-in-window/cut-in-window.component';
import { CutInListComponent } from 'component/cut-in-list/cut-in-list.component';
import { TimerBot } from '@udonarium/timer-bot';
import { SeBox } from '@udonarium/SeBox';

import { ChatWindowComponent } from 'component/chat-window/chat-window.component';
import { ContextMenuComponent } from 'component/context-menu/context-menu.component';
import { FileStorageComponent } from 'component/file-storage/file-storage.component';
import { GameCharacterGeneratorComponent } from 'component/game-character-generator/game-character-generator.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { GameObjectInventoryComponent } from 'component/game-object-inventory/game-object-inventory.component';
import { GameTableSettingComponent } from 'component/game-table-setting/game-table-setting.component';
import { JukeboxComponent } from 'component/jukebox/jukebox.component';
import { ModalComponent } from 'component/modal/modal.component';
import { PeerMenuComponent } from 'component/peer-menu/peer-menu.component';
import { TextViewComponent } from 'component/text-view/text-view.component';
import { UIPanelComponent } from 'component/ui-panel/ui-panel.component';
import { AppConfig, AppConfigService } from 'service/app-config.service';
import { ChatMessageService } from 'service/chat-message.service';
import { ContextMenuService } from 'service/context-menu.service';
import { ModalService } from 'service/modal.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { SaveDataService } from 'service/save-data.service';
import { PeerContext } from '@udonarium/core/system/network/peer-context';
import { AlermSound } from '@udonarium/timer-bot';
// タイマーメニュー
import { TimerMenuComponent } from 'component/timer/timer-menu.component';
import { AudioFile } from '@udonarium/core/file-storage/audio-file';

import { GamePanelSettingComponent } from 'component/game-panel-setting/game-panel-setting.component';
import { GamePanelSelecter } from '@udonarium/game-panel-selecter';
import { GameCharacterGenerateWindowComponent } from './component/game-character-generate-window/game-character-generate-window.component';


import { RoomSetting } from '@udonarium/room-setting';
import { Observable, Subscription, timer } from 'rxjs';
import { AppConfigCustomService } from 'service/app-config-custom.service';

const MENU_LENGTH: number = 12;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @Input() isViewer: boolean;
  @ViewChild('modalLayer', { read: ViewContainerRef, static: true }) modalLayerViewContainerRef: ViewContainerRef;
  private immediateUpdateTimer: NodeJS.Timer = null;
  private lazyUpdateTimer: NodeJS.Timer = null;
  private openPanelCount: number = 0;
  isSaveing: boolean = false;
  progresPercent: number = 0;

  roomSetting: RoomSetting;

  // GMフラグ
  obs: Observable<boolean>;
  subs: Subscription;
  isGM: boolean = false;

  get menuHeight(): number {
    if (this.isGM) return MENU_LENGTH * 50 + 85;
    return this.roomSetting.getMenuHeight();
  }

  isHorizontal = false;

  constructor(
    private modalService: ModalService,
    private panelService: PanelService,
    private pointerDeviceService: PointerDeviceService,
    private chatMessageService: ChatMessageService,
    private contextMenuService: ContextMenuService,
    private appConfigService: AppConfigService,
    private saveDataService: SaveDataService,
    private ngSelectConfig: NgSelectConfig,
    private ngZone: NgZone,
    private appCustomService: AppConfigCustomService
  ) {

    this.ngZone.runOutsideAngular(() => {
      EventSystem;
      Network;
      FileArchiver.instance.initialize();
      ImageSharingSystem.instance.initialize();
      ImageStorage.instance;
      AudioSharingSystem.instance.initialize();
      AudioStorage.instance;
      ObjectFactory.instance;
      ObjectSerializer.instance;
      ObjectStore.instance;
      ObjectSynchronizer.instance.initialize();
    });

    this.appConfigService.initialize();
    this.pointerDeviceService.initialize();
    this.ngSelectConfig.appendTo = 'body';

    TableSelecter.instance.initialize();
    ChatTabList.instance.initialize();
    DataSummarySetting.instance.initialize();
    Config.instance.initialize();
    GamePanelSelecter.instance;

    DataSummarySetting.instance.initialize();

    let diceBot: DiceBot = new DiceBot('DiceBot');
    diceBot.initialize();
    DiceBot.getHelpMessage('').then(() => this.lazyNgZoneUpdate(true));

    let jukebox: Jukebox = new Jukebox('Jukebox');
    jukebox.initialize();

    let seBox: SeBox = new SeBox('SeBox');
    seBox.initialize();

    let cutInLauncher = new CutInLauncher('CutInLauncher');
    cutInLauncher.initialize();

    let soundEffect: SoundEffect = new SoundEffect('SoundEffect');
    soundEffect.initialize();

    let timerBot: TimerBot = new TimerBot('timer-bot');
    timerBot.initialize();

    this.roomSetting = new RoomSetting('room-setting');
    this.roomSetting.initialize();

    ChatTabList.instance.addChatTab('メインタブ', 'MainTab');
    let subTab = ChatTabList.instance.addChatTab('サブタブ', 'SubTab');
    subTab.recieveOperationLogLevel = 1;

    let fileContext = ImageFile.createEmpty('none_icon').toContext();
    fileContext.url = './assets/images/ic_account_circle_black_24dp_2x.png';
    let noneIconImage = ImageStorage.instance.add(fileContext);

    AudioPlayer.resumeAudioContext();
    PresetSound.dicePick = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.dicePut = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.diceRoll1 = AudioStorage.instance.add('./assets/sounds/on-jin/spo_ge_saikoro_teburu01.mp3').identifier;
    PresetSound.diceRoll2 = AudioStorage.instance.add('./assets/sounds/on-jin/spo_ge_saikoro_teburu02.mp3').identifier;
    PresetSound.cardDraw = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/card-turn-over1.mp3').identifier;
    PresetSound.cardPick = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.cardPut = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.cardShuffle = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/card-open1.mp3').identifier;
    PresetSound.piecePick = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.piecePut = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.blockPick = AudioStorage.instance.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;
    PresetSound.blockPut = AudioStorage.instance.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;
    PresetSound.lock = AudioStorage.instance.add('./assets/sounds/tm2/tm2_switch001.wav').identifier;
    PresetSound.unlock = AudioStorage.instance.add('./assets/sounds/tm2/tm2_switch001.wav').identifier;
    PresetSound.sweep = AudioStorage.instance.add('./assets/sounds/tm2/tm2_swing003.wav').identifier;
    PresetSound.alerm = AudioStorage.instance.add(
      './assets/sounds/otologic/alerm.mp3'
    ).identifier;

    AudioStorage.instance.get(PresetSound.dicePick).isHidden = true;
    AudioStorage.instance.get(PresetSound.dicePut).isHidden = true;
    AudioStorage.instance.get(PresetSound.diceRoll1).isHidden = true;
    AudioStorage.instance.get(PresetSound.diceRoll2).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardDraw).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardPick).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardPut).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardShuffle).isHidden = true;
    AudioStorage.instance.get(PresetSound.piecePick).isHidden = true;
    AudioStorage.instance.get(PresetSound.piecePut).isHidden = true;
    AudioStorage.instance.get(PresetSound.blockPick).isHidden = true;
    AudioStorage.instance.get(PresetSound.blockPut).isHidden = true;
    AudioStorage.instance.get(PresetSound.lock).isHidden = true;
    AudioStorage.instance.get(PresetSound.unlock).isHidden = true;
    AudioStorage.instance.get(PresetSound.sweep).isHidden = true;

    // アラーム
    AudioStorage.instance.get(PresetSound.alerm).isHidden = true;
    AudioStorage.instance.get(PresetSound.alerm).name = 'アラーム音（電子）';

    // アラーム
    AlermSound.alermFileList.forEach((o) => {
      const sound: AudioFile = AudioStorage.instance.add(o.path);
      sound.isHidden = true;
      sound.name = 'アラーム_' + o.name;
    });

    PeerCursor.createMyCursor();
    PeerCursor.myCursor.name = 'プレイヤー';
    PeerCursor.myCursor.imageIdentifier = noneIconImage.identifier;

    EventSystem.register(this)
      .on('START_CUT_IN', event => { this.startCutIn( event.data.cutIn ); })
      .on('STOP_CUT_IN', event => { if ( ! event.data.cutIn ) return; console.log('カットインイベント_ストップ'  + event.data.cutIn.name ); })
      .on('UPDATE_GAME_OBJECT', event => { this.lazyNgZoneUpdate(event.isSendFromSelf); })
      .on('DELETE_GAME_OBJECT', event => { this.lazyNgZoneUpdate(event.isSendFromSelf); })
      .on('SYNCHRONIZE_AUDIO_LIST', event => { if (event.isSendFromSelf) this.lazyNgZoneUpdate(false); })
      .on('SYNCHRONIZE_FILE_LIST', event => { if (event.isSendFromSelf) this.lazyNgZoneUpdate(false); })
      .on<AppConfig>('LOAD_CONFIG', event => {
        console.log('LOAD_CONFIG !!!');
        Network.setApiKey(event.data.webrtc.key);
        Network.open();
      })
      .on<File>('FILE_LOADED', event => {
        this.lazyNgZoneUpdate(false);
      })
      .on('OPEN_NETWORK', event => {
        console.log('OPEN_NETWORK', event.data.peerId);
        PeerCursor.myCursor.peerId = Network.peerContext.peerId;
        PeerCursor.myCursor.userId = Network.peerContext.userId;

        // 接続
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const id = params.get('id');

        if (id) {
          let context = PeerContext.create(id);
          if (context.isRoom) return;
          ObjectStore.instance.clearDeleteHistory();
          Network.connect(context.peerId);
        }
      })
      .on('NETWORK_ERROR', event => {
        console.log('NETWORK_ERROR', event.data.peerId);
        let errorType: string = event.data.errorType;
        let errorMessage: string = event.data.errorMessage;

        this.ngZone.run(async () => {
          //SKyWayエラーハンドリング
          let quietErrorTypes = ['peer-unavailable'];
          let reconnectErrorTypes = ['disconnected', 'socket-error', 'unavailable-id', 'authentication', 'server-error'];

          if (quietErrorTypes.includes(errorType)) return;
          await this.modalService.open(TextViewComponent, { title: 'ネットワークエラー', text: errorMessage });

          if (!reconnectErrorTypes.includes(errorType)) return;
          await this.modalService.open(TextViewComponent, { title: 'ネットワークエラー', text: 'このウィンドウを閉じると再接続を試みます。' });
          Network.open();
        });
      })
      .on('CONNECT_PEER', event => {
        if (event.isSendFromSelf) this.chatMessageService.calibrateTimeOffset();
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      })
      .on('DISCONNECT_PEER', event => {
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      });

    // GMフラグ管理
    this.obs = this.appCustomService.isViewer$;
    this.subs = this.obs.subscribe((flg) => {
      this.isGM = flg;
    });
    this.isGM = this.appCustomService.dataViewer;
  }

  ngOnInit() {
    ;
  }

  ngAfterViewInit() {
    PanelService.defaultParentViewContainerRef =
      ModalService.defaultParentViewContainerRef =
        ContextMenuService.defaultParentViewContainerRef =
          this.modalLayerViewContainerRef;
    PanelService.defaultParentViewContainerRef =
      ModalService.defaultParentViewContainerRef =
        ContextMenuService.defaultParentViewContainerRef =
          this.modalLayerViewContainerRef;

    setTimeout(() => {
      this.panelService.open(PeerMenuComponent, { width: 500, height: 550, left: 100 });
      //this.panelService.open(ChatWindowComponent, { width: 700, height: 400, left: 100, top: 450 });
      this.panelService.open(TimerMenuComponent, { width: 180, height: 90, left: 1500, top: 10, className: 'timer-menu-panel' });
    }, 0);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  startCutIn( cutIn: CutIn ){
    if ( ! cutIn ) return;
    console.log( 'カットインイベント_スタート' + cutIn.name );
    let option: PanelOption = { width: 200, height: 100, left: 300 , top: 100};
    option.title = 'カットイン : ' + cutIn.name ;

    console.log( '画面領域 w:' + window.innerWidth + ' h:' + window.innerHeight );

    let cutin_w = cutIn.width;
    let cutin_h = cutIn.height;

    console.log( '画像サイズ w:' + cutin_w + ' h:' + cutin_h );

    let margin_w = window.innerWidth - cutin_w ;
    let margin_h = window.innerHeight - cutin_h - 25 ;

    if ( margin_w < 0 )margin_w = 0 ;
    if ( margin_h < 0 )margin_h = 0 ;

    let margin_x = margin_w * cutIn.x_pos / 100;
    let margin_y = margin_h * cutIn.y_pos / 100;

    option.width = cutin_w ;
    option.height = cutin_h + 25 ;
    option.left = margin_x ;
    option.top = margin_y;
    option.isCutIn = true;
    option.cutInIdentifier = cutIn.identifier;


    let component = this.panelService.open(CutInWindowComponent, option);
    component.cutIn = cutIn;
    component.startCutIn();

  }

  open(componentName: string) {
    let component: { new(...args: any[]): any } = null;
    let option: PanelOption = { width: 450, height: 600, left: 100 }
    switch (componentName) {
      case 'PeerMenuComponent':
        component = PeerMenuComponent;
        break;
      case 'ChatWindowComponent':
        component = ChatWindowComponent;
        option.width = 700;
        break;
      case 'GameTableSettingComponent':
        component = GameTableSettingComponent;
        option = { width: 630, height: 400, left: 100 };
          break;
      case 'FileStorageComponent':
        component = FileStorageComponent;
        break;
      case 'GameCharacterSheetComponent':
        component = GameCharacterSheetComponent;
        break;
      case 'JukeboxComponent':
        component = JukeboxComponent;
        break;
      case 'CutInListComponent':
        component = CutInListComponent;
        option = {width: 650, height: 740}
        break;
      case 'GameCharacterGeneratorComponent':
        component = GameCharacterGeneratorComponent;
        option = { width: 500, height: 300, left: 100 };
        break;
      case 'GameObjectInventoryComponent':
        component = GameObjectInventoryComponent;
        break;
      case 'GamePanelSettingComponent':
        component = GamePanelSettingComponent ;
        option = { width: 600, height: 440, left: 100 };
        break;
      // タイマーメニュー(特殊処理)
      case 'TimerMenuComponent':
        component = TimerMenuComponent;
        option = {
          width: 180,
          height: 80,
          left: 1000,
          top: 10,
          className: 'timer-menu-panel',
        };
        this.openPanelCount = this.openPanelCount + 1;
        option.top = option.top + this.openPanelCount * 10;
        this.panelService.open(component, option);
        return;
      case 'game-character-generate':
        component = GameCharacterGenerateWindowComponent;
        option = { width: 600, height: 180, left: 100, };
        break;
    }
    if (component) {
      option.top = (this.openPanelCount % 10 + 1) * 20;
      option.left = 100 + (this.openPanelCount % 20 + 1) * 5;
      this.openPanelCount = this.openPanelCount + 1;
      this.panelService.open(component, option);
    }
  }

  async save() {
    if (this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    let roomName = Network.peerContext && 0 < Network.peerContext.roomName.length
      ? Network.peerContext.roomName
      : 'ルームデータ';
    await this.saveDataService.saveRoomAsync(roomName, percent => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  utilitymenu(event: Event){
    const button = <HTMLElement>event.target;
    const clientRect = button.getBoundingClientRect();
    const position = {
      x: window.pageXOffset + clientRect.left + (this.isHorizontal ? 0 : button.clientWidth * 0.9),
      y: window.pageYOffset + clientRect.top + (this.isHorizontal ? button.clientHeight * 0.9 : 0)
    };
    this.contextMenuService.open(position, [
      { name: `URLからキャラ駒生成`,
        action: () => {
          this.open("game-character-generate")
        }
      }])
  }

  handleFileSelect(event: Event) {
    let input = <HTMLInputElement>event.target;
    let files = input.files;
    if (files.length) FileArchiver.instance.load(files);
    input.value = '';
  }

  private lazyNgZoneUpdate(isImmediate: boolean) {
    if (isImmediate) {
      if (this.immediateUpdateTimer !== null) return;
      this.immediateUpdateTimer = setTimeout(() => {
        this.immediateUpdateTimer = null;
        if (this.lazyUpdateTimer != null) {
          clearTimeout(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null;
        }
        this.ngZone.run(() => { });
      }, 0);
    } else {
      if (this.lazyUpdateTimer !== null) return;
      this.lazyUpdateTimer = setTimeout(() => {
        this.lazyUpdateTimer = null;
        if (this.immediateUpdateTimer != null) {
          clearTimeout(this.immediateUpdateTimer);
          this.immediateUpdateTimer = null;
        }
        this.ngZone.run(() => { });
      }, 100);
    }
  }
  rotateChange(isHorizontal) {
    this.isHorizontal = isHorizontal;
  }
}

PanelService.UIPanelComponentClass = UIPanelComponent;
ContextMenuService.ContextMenuComponentClass = ContextMenuComponent;
ModalService.ModalComponentClass = ModalComponent;
