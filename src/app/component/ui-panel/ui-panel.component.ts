import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { CutIn } from '@udonarium/cut-in';

@Component({
  selector: 'ui-panel',
  templateUrl: './ui-panel.component.html',
  styleUrls: ['./ui-panel.component.css'],
  providers: [
    PanelService,
  ],
  animations: [
    trigger('flyInOut', [
      transition('void => *', [
        animate('100ms ease-out', keyframes([
          style({ transform: 'scale(0.8, 0.8)', opacity: '0', offset: 0 }),
          style({ transform: 'scale(1.0, 1.0)', opacity: '1', offset: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate(100, style({ transform: 'scale(0, 0)' }))
      ]),
    ]),
  ],
})
export class UIPanelComponent implements OnInit {
  @ViewChild('draggablePanel', { static: true }) draggablePanel: ElementRef<HTMLElement>;
  @ViewChild('scrollablePanel', { static: true }) scrollablePanel: ElementRef<HTMLDivElement>;
  @ViewChild('content', { read: ViewContainerRef, static: true }) content: ViewContainerRef;
  @ViewChild('titleBar', { static: true }) titleBar: ElementRef<HTMLDivElement>;

  @Input() set title(title: string) { this.panelService.title = title; }
  @Input() set left(left: number) { this.panelService.left = left; }
  @Input() set top(top: number) { this.panelService.top = top; }
  @Input() set width(width: number) { this.panelService.width = width; }
  @Input() set height(height: number) { this.panelService.height = height; }
  @Input() set isAbleMinimizeButton(isAbleMinimizeButton: boolean) { this.panelService.isAbleMinimizeButton = isAbleMinimizeButton; }
  @Input() set isAbleFullScreenButton(isAbleFullScreenButton: boolean) { this.panelService.isAbleFullScreenButton = isAbleFullScreenButton; }
  @Input() set isAbleCloseButton(isAbleCloseButton: boolean) { this.panelService.isAbleCloseButton = isAbleCloseButton; }
  @Input() set isAbleRotateButton(isAbleRotateButton: boolean) { this.panelService.isAbleRotateButton = isAbleRotateButton; }
  @Input() set className(className: string) { this.panelService.className = className; }

  @Output() rotateEvent = new EventEmitter<boolean>();

  get title(): string { return this.panelService.title; }
  get left() { return this.panelService.left; }
  get top() { return this.panelService.top; }
  get width() { return this.panelService.width; }
  get height() { return this.panelService.height; }
  get isAbleMinimizeButton() { return this.panelService.isAbleMinimizeButton; }
  get isAbleFullScreenButton() { return this.panelService.isAbleFullScreenButton; }
  get isAbleCloseButton() { return this.panelService.isAbleCloseButton; }
  get isAbleRotateButton() { return this.panelService.isAbleRotateButton; }
  get className() { return this.panelService.className; }

  private preLeft: number = 0;
  private preTop: number = 0;
  private preWidth: number = 100;
  private preHeight: number = 100;
  private preClassName: string = '';

   // 今はメニューだけなのでとりあえず
  private saveWidth: number = 1034;
  private saveHeight: number = 100;

  isFullScreen: boolean = false;
  isMinimized: boolean = false;
  isHorizontal: boolean = false;

  private timerCheckWindowSize = null;

  get isPointerDragging(): boolean { return this.pointerDeviceService.isDragging || this.pointerDeviceService.isTablePickGesture; }

  constructor(
    public panelService: PanelService,
    private pointerDeviceService: PointerDeviceService
  ) {}

  ngOnInit() {
    this.panelService.scrollablePanel = this.scrollablePanel.nativeElement;
    this.timerCheckWindowSize = setInterval(() => {
      this.chkeWindowMinSize();
    },500);
  }

  chkeWindowMinSize(){
    const id = this.panelService.cutInIdentifier;
    if(!id )return;
    const cutIn = ObjectStore.instance.get<CutIn>(id);
    if(!cutIn)return;
    if(!cutIn.videoId)return;

    let panel = this.draggablePanel.nativeElement

    const nowW = parseInt(panel.style.width);
    const nowH = parseInt(panel.style.height);
    if (nowW < cutIn.minSizeWidth(true)){
      panel.style.width = cutIn.minSizeWidth(true) + 'px';
    }
    if (nowH < cutIn.minSizeHeight(true)){
      panel.style.height = cutIn.minSizeHeight(true) + 'px';
    }
    // はみ出し防止処理
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const offsetL: number = panel.offsetLeft;
    const offsetT: number = panel.offsetTop;

    const overR = offsetL + cutIn.minSizeWidth(true) - winW;
    if( overR >= 0){
      const newOffL = offsetL - overR <= 0 ? 0 : offsetL - overR;
      panel.style.left = newOffL + 'px';
    }

    const overB = offsetT + cutIn.minSizeHeight(true) - winH;
    if( overB >= 0){
      const newOffT = offsetT - overB <= 0 ? 0 : offsetT - overB;
      panel.style.top = newOffT + 'px';
    }
  }

  toggleMinimize() {
    if (this.isFullScreen) return;
    const id = this.panelService.cutInIdentifier;
    if (id){
      const cutIn = ObjectStore.instance.get<CutIn>(id);
      if (cutIn.videoId){
        return;
      }
    }

    let body  = this.scrollablePanel.nativeElement;
    let panel = this.draggablePanel.nativeElement;
    if (this.isMinimized) {
      this.isMinimized = false;
      body.style.display = null;
      this.height = this.preHeight;
    } else {
      this.preHeight = panel.offsetHeight;

      this.isMinimized = true;
      body.style.display = 'none';
      this.height = this.titleBar.nativeElement.offsetHeight;
    }
  }

  toggleFullScreen() {
    let panel = this.draggablePanel.nativeElement;
    if (panel.offsetLeft <= 0
      && panel.offsetTop <= 0
      && panel.offsetWidth >= window.innerWidth
      && panel.offsetHeight >= window.innerHeight) {
      this.isFullScreen = false;
    } else {
      this.isFullScreen = true;
    }

    if (this.isFullScreen) {
      this.preLeft = panel.offsetLeft;
      this.preTop = panel.offsetTop;
      this.preWidth = panel.offsetWidth;
      this.preHeight = panel.offsetHeight;

      this.left = 0;
      this.top = 0;
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      panel.style.left = this.left + 'px';
      panel.style.top = this.top + 'px';
      panel.style.width = this.width + 'px';
      panel.style.height = this.height + 'px';
    } else {
      this.left = this.preLeft;
      this.top = this.preTop;
      this.width = this.preWidth;
      this.height = this.preHeight;
    }
  }

  toggleRotate() {
    this.isHorizontal = !this.isHorizontal;
    this.rotateEvent.emit(this.isHorizontal);
    const panel = this.draggablePanel.nativeElement;
    panel.style.transition = 'width 0.1s ease-in-out, height 0.1s ease-in-out';
    setTimeout(() => {
      panel.style.transition = null;
    }, 100);
    const saveWidth = panel.offsetWidth;
    const saveHeight = panel.offsetHeight;
    if (!this.isFullScreen) {
      panel.style.width = this.saveWidth + 'px';
      panel.style.height = this.saveHeight + 'px';
    }
    this.saveWidth = saveWidth;
    this.saveHeight = saveHeight;
  }

  close() {
    if (this.panelService) this.panelService.close();
  }
}
