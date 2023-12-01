import { ComponentRef, Injectable, OnChanges, ViewContainerRef } from '@angular/core';
import { ChatTab } from '@udonarium/chat-tab';
import { CardStack } from '@udonarium/card-stack';

declare var Type: FunctionConstructor;
interface Type<T> extends Function {
  new (...args: any[]): T;
}

export interface PanelOption {
  title?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;

  isCutIn?: boolean; //この方式でよいか検討のこと
  cutInIdentifier?: string;
  className?: string;
  isHidetitleBar?: boolean;
}

@Injectable()
export class PanelService {
  /* Todo */
  static defaultParentViewContainerRef: ViewContainerRef;
  static UIPanelComponentClass: { new (...args: any[]): any } = null;

  private panelComponentRef: ComponentRef<any>
  title: string = '無名のパネル';
  left: number = 0;
  top: number = 0;
  width: number = 100;
  height: number = 100;
  titleBar: boolean = true;
  isAbleMinimizeButton: boolean = true;
  isAbleFullScreenButton: boolean = true;
  isAbleCloseButton: boolean = true;
  isAbleRotateButton: boolean = false;
  isCutIn: boolean = false ; //この方式でよいか検討のこと
  cutInIdentifier: string = '';
  chatTab: ChatTab = null;
  cardStack: CardStack = null;
  className: string = '';
  isHideTitleBar: boolean = false;

  scrollablePanel: HTMLDivElement = null;

  get isShow(): boolean {
    return this.panelComponentRef ? true : false;
  }

  open<T>(childComponent: Type<T>, option?: PanelOption, parentViewContainerRef?: ViewContainerRef): T {
    if (!parentViewContainerRef) {
      parentViewContainerRef = PanelService.defaultParentViewContainerRef;
    }

    const injector = parentViewContainerRef.injector;

    let panelComponentRef: ComponentRef<any> = parentViewContainerRef.createComponent(PanelService.UIPanelComponentClass, { index: parentViewContainerRef.length, injector: injector });
    let bodyComponentRef: ComponentRef<any> = panelComponentRef.instance.content.createComponent(childComponent);

    const childPanelService: PanelService = panelComponentRef.injector.get(PanelService);

    childPanelService.panelComponentRef = panelComponentRef;
    if (option) {
      if (option.title) childPanelService.title = option.title;
      if (option.top) childPanelService.top = option.top;
      if (option.left) childPanelService.left = option.left;
      if (option.width) childPanelService.width = option.width;
      if (option.height) childPanelService.height = option.height;
      if (option.className) childPanelService.className = option.className;
      if (option.isHidetitleBar) childPanelService.isHideTitleBar = option.isHidetitleBar;
    }
    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null;
      panelComponentRef = null;
    });

    bodyComponentRef.onDestroy(() => {
      bodyComponentRef = null;
    });

    let panelOnChanges = panelComponentRef.instance as OnChanges;
    let bodyOnChanges = bodyComponentRef.instance as OnChanges;
    if (panelOnChanges?.ngOnChanges != null || bodyOnChanges?.ngOnChanges != null) {
      queueMicrotask(() => {
        if (bodyComponentRef && bodyOnChanges?.ngOnChanges != null) bodyOnChanges?.ngOnChanges({});
        if (panelComponentRef && panelOnChanges?.ngOnChanges != null) panelOnChanges?.ngOnChanges({});
      });
    }

    return <T>bodyComponentRef.instance;
  }

  close() {
    if (this.panelComponentRef) {
      this.panelComponentRef.destroy();
      this.panelComponentRef = null;
    }
  }
}
