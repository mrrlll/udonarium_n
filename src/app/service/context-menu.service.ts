import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { TabletopObject } from '@udonarium/tabletop-object';

interface ContextMenuPoint {
  x: number,
  y: number
}

export enum ContextMenuType {
  ACTION = 'action',
  SEPARATOR = 'separator',
}

export const ContextMenuSeparator: ContextMenuAction = {
  name: '',
  disabled: true,
  type: ContextMenuType.SEPARATOR
}

export interface ContextMenuAction {
  name: string,
  action?: Function,
  disabled?: boolean,
  type?: ContextMenuType,
  subActions?: ContextMenuAction[],
  altitudeHande?: TabletopObject
}

@Injectable()
export class ContextMenuService {
  /* Todo */
  static defaultParentViewContainerRef: ViewContainerRef;
  static ContextMenuComponentClass: { new(...args: any[]): any } = null;

  private panelComponentRef: ComponentRef<any>

  title: string = '';
  actions: ContextMenuAction[] = [];
  position: ContextMenuPoint = { x: 0, y: 0 };

  get isShow(): boolean {
    return this.panelComponentRef ? true : false;
  }

  open(position: ContextMenuPoint, actions: ContextMenuAction[], title?: string, parentViewContainerRef?: ViewContainerRef) {
    this.close();
    if (!parentViewContainerRef) {
      parentViewContainerRef = ContextMenuService.defaultParentViewContainerRef;
    }

    const injector = parentViewContainerRef.injector;

    let panelComponentRef: ComponentRef<any> = parentViewContainerRef.createComponent(ContextMenuService.ContextMenuComponentClass, { index: parentViewContainerRef.length, injector: injector });

    const childPanelService: ContextMenuService = panelComponentRef.injector.get(ContextMenuService);

    childPanelService.panelComponentRef = panelComponentRef;
    if (actions) {
      childPanelService.actions = actions.filter(act => act.disabled === undefined || act.disabled === false);
    }
    if (position) {
      childPanelService.position.x = position.x;
      childPanelService.position.y = position.y;
    }

    childPanelService.title = title != null ? title : '';

    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null;
    });
  }

  close() {
    if (this.panelComponentRef) {
      this.panelComponentRef.destroy();
      this.panelComponentRef = null;
    }
  }
}
