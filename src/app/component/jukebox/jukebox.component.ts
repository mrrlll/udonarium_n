import { Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';
import { AudioFile } from '@udonarium/core/file-storage/audio-file';
import { AudioPlayer, VolumeType } from '@udonarium/core/file-storage/audio-player';
import { AudioStorage } from '@udonarium/core/file-storage/audio-storage';
import { FileArchiver } from '@udonarium/core/file-storage/file-archiver';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem } from '@udonarium/core/system';
import { Jukebox } from '@udonarium/Jukebox';
import { Config } from '@udonarium/config';
import { ModalService } from 'service/modal.service';

import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { PanelOption, PanelService } from 'service/panel.service';

import { CutInLauncher } from '@udonarium/cut-in-launcher';
import { SeBox } from '@udonarium/SeBox';
import { AppConfigCustomService } from 'service/app-config-custom.service';

@Component({
  selector: 'app-jukebox',
  templateUrl: './jukebox.component.html',
  styleUrls: ['./jukebox.component.css']
})
export class JukeboxComponent implements OnInit, OnDestroy {

  @Input() isViewer: boolean;

  selectTab: string = '全て';
  filteredAudioList: AudioFile[] = [];

  get roomVolume(): number {
    let conf = ObjectStore.instance.get<Config>('Config');
    return conf? conf.roomVolume : 1 ;
  }
  set roomVolume(volume: number){
    let conf = ObjectStore.instance.get<Config>('Config');
    if(conf) conf.roomVolume = volume;
    this.jukebox.setNewVolume();
  }

  get volume(): number {
    return this.jukebox.volume;
  }
  set volume(volume: number) {
    this.jukebox.volume = volume;
    AudioPlayer.volume = volume * this.roomVolume;
    EventSystem.trigger('CHANGE_JUKEBOX_VOLUME', null);
    if (window.localStorage) {
      localStorage.setItem(AudioPlayer.MAIN_VOLUME_LOCAL_STORAGE_KEY, volume.toString());
    }
  }

  get auditionVolume(): number {
    return this.jukebox.auditionVolume;
  }
  set auditionVolume(auditionVolume: number) {
    this.jukebox.auditionVolume = auditionVolume;
    AudioPlayer.auditionVolume = auditionVolume * this.auditionVolume;
    EventSystem.trigger('CHANGE_JUKEBOX_VOLUME', null);
    if (window.localStorage) {
      localStorage.setItem(AudioPlayer.AUDITION_VOLUME_LOCAL_STORAGE_KEY, auditionVolume.toString());
    }
  }

  get seVolume(): number {
    return AudioPlayer.seVolume;
  }
  set seVolume(seVolume: number) {
    AudioPlayer.seVolume = seVolume;
    EventSystem.trigger('CHANGE_JUKEBOX_VOLUME', null);
    if (window.localStorage) {
      localStorage.setItem(AudioPlayer.SE_VOLUME_LOCAL_STORAGE_KEY, seVolume.toString());
    }
  }

  get audios(): AudioFile[] { return AudioStorage.instance.audios.filter(audio => !audio.isHidden); }
  get jukebox(): Jukebox { return ObjectStore.instance.get<Jukebox>('Jukebox'); }
  get seBox(): SeBox {
    return ObjectStore.instance.get<SeBox>('SeBox');
  }

  get percentVolume(): number { return Math.floor(this.volume * 100); }
  set percentVolume(percentVolume: number) { this.volume = percentVolume / 100; }

  get percentRoomVolume(): number { return Math.floor(this.roomVolume * 100); }
  set percentRoomVolume(percentRoomVolume: number) { this.roomVolume = percentRoomVolume / 100; }

  get percentAuditionVolume(): number { return Math.floor(this.auditionVolume * 100); }
  set percentAuditionVolume(percentAuditionVolume: number) { this.auditionVolume = percentAuditionVolume / 100; }

  get percentSEVolume(): number { return Math.floor(this.seVolume * 100); }
  set percentSEVolume(percentSEVolume: number) { this.seVolume = percentSEVolume / 100; }

  get cutInLauncher(): CutInLauncher { return ObjectStore.instance.get<CutInLauncher>('CutInLauncher'); }

  readonly auditionPlayer: AudioPlayer = new AudioPlayer();
  private lazyUpdateTimer: NodeJS.Timer = null;

  constructor(
    private contextMenuService: ContextMenuService,
    private modalService: ModalService,
    private panelService: PanelService,
    private pointerDeviceService: PointerDeviceService,
    private ngZone: NgZone,
    private appCustomService: AppConfigCustomService
  ) {
    if (window.localStorage) {
      if (localStorage.getItem(AudioPlayer.MAIN_VOLUME_LOCAL_STORAGE_KEY) != null) {
        this.volume = parseFloat(localStorage.getItem(AudioPlayer.MAIN_VOLUME_LOCAL_STORAGE_KEY));
      }
      if (localStorage.getItem(AudioPlayer.AUDITION_VOLUME_LOCAL_STORAGE_KEY) != null) {
        this.auditionVolume = parseFloat(localStorage.getItem(AudioPlayer.AUDITION_VOLUME_LOCAL_STORAGE_KEY));
      }
      if (localStorage.getItem(AudioPlayer.SE_VOLUME_LOCAL_STORAGE_KEY) != null) {
        this.seVolume = parseFloat(localStorage.getItem(AudioPlayer.SE_VOLUME_LOCAL_STORAGE_KEY));
      }
    }
  }

  ngOnInit() {
    this.getAudioObjects('BGM');
    this.isViewer = this.appCustomService.dataViewer;
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'ジュークボックス');
    this.auditionPlayer.volumeType = VolumeType.AUDITION;
    EventSystem.register(this)
      .on('*', event => {
        if (event.eventName.startsWith('FILE_')) {
          this.lazyNgZoneUpdate();
          this.getAudioObjects(this.selectTab);
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.stopAudition();
  }

  playAudition(audio: AudioFile) {
    this.auditionPlayer.play(audio);
  }

  stopAudition() {
    this.auditionPlayer.stop();
  }

  playBGM(audio: AudioFile) { //memoこっちが全体

    //タグなしのBGM付きカットインはジュークボックスと同時に鳴らさないようにする
    //BGM駆動のためのインスタンスを別にしているため現状この処理で止める
    this.cutInLauncher.stopBlankTagCutIn();

    this.jukebox.play(audio.identifier, true);

  }

  stopBGM(audio: AudioFile) {
    if (this.jukebox.audio === audio) this.jukebox.stop();
  }

  //SE再生
  playSE(audio: AudioFile) {
    this.seBox.play(audio.identifier, false);
  }

  stopSE(audio: AudioFile) {
    if (this.seBox.audio === audio) this.seBox.stop();
  }

  handleFileSelect(event: Event) {
    let input = <HTMLInputElement>event.target;
    let files = input.files;
    if (files.length) FileArchiver.instance.load(files);
    input.value = '';
  }

  private lazyNgZoneUpdate() {
    if (this.lazyUpdateTimer !== null) return;
    this.lazyUpdateTimer = setTimeout(() => {
      this.lazyUpdateTimer = null;
      this.ngZone.run(() => { });
    }, 100);
  }

  deleteAudioFile(audio) {
    if (this.auditionPlayer.audio && this.auditionPlayer.audio.identifier === audio.identifier) {
      this.stopAudition();
    }
    if (this.jukebox.audio && this.jukebox.audio.identifier === audio.identifier) {
      this.jukebox.stop();
    }
    if (this.seBox.audio && this.seBox.audio.identifier === audio.identifier) {
      this.seBox.stop();
    }
    EventSystem.call('DELETE_AUDIO_FILE', audio.identifier);
  }

  fadeoutInProgress = false;
  fadeinInProgress = false;

  fadeout() {
    // フェードアウトorイン処理が既に実行中の場合は処理を無視
    if (this.fadeoutInProgress || this.fadeinInProgress || this.roomVolume <= 0) {
      return;
    }

    // フェードアウト処理の進行中フラグを設定
    this.fadeoutInProgress = true;

    //roomVolumeを徐々に0に減らしていく
    let fadeoutInterval = setInterval(() => {
      this.roomVolume -= 0.05;
      if (this.roomVolume <= 0) {
        clearInterval(fadeoutInterval);
        this.roomVolume = 0;
        this.fadeoutInProgress = false;  // フェードアウト処理の進行中フラグをリセット
      }
    }, 100);
  }

  fadein() {
    // フェードアウトorイン処理が既に実行中の場合は処理を無視
    if (this.fadeoutInProgress || this.fadeinInProgress || this.roomVolume >= 1) {
      return;
    }
    // フェードアウト処理の進行中フラグを設定
    this.fadeinInProgress = true;

    //roomVolumeを徐々に100に増やしていく
    let fadeinInterval = setInterval(() => {
      this.roomVolume += 0.05;
      if (this.roomVolume >= 1) {
        clearInterval(fadeinInterval);
        this.roomVolume = 1;
        this.fadeinInProgress = false;  // フェードイン処理の進行中フラグをリセット
      }
    }, 100);
  }

  updateAuditionVolume() {
    this.auditionVolume = parseFloat(this.auditionVolume.toFixed(2));
  }

  updateSeVolume() {
    this.seVolume = parseFloat(this.seVolume.toFixed(2));
  }

  updateVolume() {
    this.volume = parseFloat(this.volume.toFixed(2));
  }

  updateRoomVolume() {
    this.roomVolume = parseFloat(this.roomVolume.toFixed(2));
  }

  // コンポーネントのクラス内に宣言を追加します
  previousAuditionVolume: number;
  previousVolume: number;
  previousSEVolume: number;
  previousRoomVolume: number;

  isAuditionMuted: boolean = false;
  isBgmMuted: boolean = false;
  isSeMuted: boolean = false;
  isRoomMuted: boolean = false;

  auditionLabel: string = "試聴:";
  bgmLabel: string = "BGM:";
  seLabel: string = "SE:";
  roomLabel: string = "全体:";

  toggleMute(target: string) {
    switch (target) {
      case 'audition':
        this.isAuditionMuted = !this.isAuditionMuted;
        this.auditionLabel = this.isAuditionMuted ? "試聴🔇:" : "試聴:";
        if (this.isAuditionMuted) {
          this.previousAuditionVolume = this.auditionVolume;
          this.auditionVolume = 0;
        } else {
          this.auditionVolume = this.previousAuditionVolume;
        }
        break;
      case 'bgm':
        this.isBgmMuted = !this.isBgmMuted;
        this.bgmLabel = this.isBgmMuted ? "BGM🔇:" : "BGM:";
        if (this.isBgmMuted) {
          this.previousVolume = this.volume;
          this.volume = 0;
        } else {
          this.volume = this.previousVolume;
        }
        break;
      case 'se':
        this.isSeMuted = !this.isSeMuted;
        this.seLabel = this.isSeMuted ? "SE🔇:" : "SE:";
        if (this.isSeMuted) {
          this.previousSEVolume = this.seVolume;
          this.seVolume = 0;
        } else {
          this.seVolume = this.previousSEVolume;
        }
        break;
      case 'room':
        this.isRoomMuted = !this.isRoomMuted;
        this.roomLabel = this.isRoomMuted ? "全体🔇:" : "全体:";
        if (this.isRoomMuted) {
          this.previousRoomVolume = this.roomVolume;
          this.roomVolume = 0;
        } else {
          this.roomVolume = this.previousRoomVolume;
        }
        break;
    }
  }

  // コンポーネントのメソッド内に追加します
  tooltipTexts: { [key: string]: string } = {
    audition: "ダブルクリックでミュート切り替え",
    bgm: "ダブルクリックでミュート切り替え",
    se: "ダブルクリックでミュート切り替え",
    room: "ダブルクリックでミュート切り替え"
  };
  tooltipVisible: { [key: string]: boolean } = {
    audition: false,
    bgm: false,
    se: false,
    room: false
  };

  getTooltip(target: string): string {
    return this.tooltipTexts[target];
  }

  showTooltip(target: string): void {
    this.tooltipVisible[target] = true;
  }

  hideTooltip(target: string): void {
    this.tooltipVisible[target] = false;
  }

  // get audios(): AudioFile[] { return AudioStorage.instance.audios.filter(audio => !audio.isHidden); }

  getAudioObjects(AudioType: string): void {
    // audiosから指定されたタイプのオーディオを抽出
    // AudioTypeがbgmの場合はaudio.bgmがtrueのものを抽出
    // AudioTypeがseの場合はaudio.seがtrueのものを抽出
    let audioObjects: AudioFile[] = [];
    for (let audio of this.audios) {
      if (AudioType == 'BGM' && audio.bgm) {
        audioObjects.push(audio);
      }
      if (AudioType == 'SE' && audio.se) {
        audioObjects.push(audio);
      }
      if (AudioType == '全て') {
        audioObjects.push(audio);
      }
    }
    this.filteredAudioList = audioObjects;
  }

  updateFilteredAudioList() {
    if (this.selectTab == 'BGM') {
      this.getAudioObjects('BGM');
    }
    if (this.selectTab == 'SE') {
      this.getAudioObjects('SE');
    }
    if (this.selectTab == '全て')
      this.filteredAudioList = this.audios;
  }

  trackByfilteredAudioList(index: number, gameObject: AudioFile){
    return gameObject ? gameObject.identifier : index;
  }

  onContextMenu(event: Event, gameObject: AudioFile) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const target = <HTMLElement>event.target;
    let position;
    if (target && target.tagName === 'BUTTON') {
      const clientRect = target.getBoundingClientRect();
      position = {
        x: window.pageXOffset + clientRect.left + target.clientWidth,
        y: window.pageYOffset + clientRect.top
      };
    } else {
      position = this.pointerDeviceService.pointers[0];
    }

    let actions: ContextMenuAction[] = [];

    if(gameObject.bgm){
      actions.push({ name: '☑ BGM', action: () => { gameObject.bgm = false; this.updateFilteredAudioList(); } });
    } else {
      actions.push({ name: '☐ BGM', action: () => { gameObject.bgm = true; this.updateFilteredAudioList(); } });
    }
    if(gameObject.se){
      actions.push({ name: '☑ SE', action: () => { gameObject.se = false; this.updateFilteredAudioList(); } });
    } else {
      actions.push({ name: '☐ SE', action: () => { gameObject.se = true; this.updateFilteredAudioList(); } });
    }

    this.contextMenuService.open(position, actions, gameObject.name);
  }
}
