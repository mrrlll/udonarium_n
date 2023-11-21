import { InputHandler } from 'directive/input-handler';
import { PointerCoordinate, PointerDeviceService } from 'service/pointer-device.service';
import { TabletopSelectionService } from 'service/tabletop-selection.service';

type Callback = () => void;
type CancelCheckCallback = () => boolean;

export class TablePickGesture {
  readonly pickCursor: PickCursor;
  readonly pickArea: PickArea;

  private input: InputHandler = null;
  private activateTimer: NodeJS.Timer = null;
  private keydownTimer: NodeJS.Timer = null;

  private get isActive(): boolean { return this.pointerDevice.isTablePickGesture; }
  private set isActive(isActive: boolean) { this.pointerDevice.isTablePickGesture = isActive; }

  isStrokeMode = false;
  isKeepSelection = false;
  private isObjectDragging = false;
  private isPointerMoved = false;
  private target: HTMLElement = null;

  private callbackOnKeydown = (e) => this.onKeydown(e);

  onstart: Callback = null;
  onend: Callback = null;
  oncancelifneeded: CancelCheckCallback = null;
  onpick: Callback = null;

  constructor(
    readonly targetElement: HTMLElement,
    readonly gameObjectsElement: HTMLElement,
    pickCursorElement: HTMLElement,
    pickAreaElement: HTMLElement,
    private pointerDevice: PointerDeviceService,
    private selection: TabletopSelectionService
  ) {
    this.pickCursor = new PickCursor(pickCursorElement);
    this.pickArea = new PickArea(pickAreaElement);
    this.initialize();
  }

  private initialize() {
    this.input = new InputHandler(this.targetElement);
    this.input.onStart = this.onInputStart.bind(this);
    this.input.onMove = this.onInputMove.bind(this);
    this.input.onEnd = this.onInputEnd.bind(this);
  }

  cancel() {
    this.input.cancel();
    this.clearActivateTimer();
    this.pickCursor.deactive();

    this.isStrokeMode = false;
    this.isActive = false;
    this.isKeepSelection = false;
    this.isObjectDragging = false;
    this.isPointerMoved = false;
    this.target = null;

    this.clearKeyDownTimer();
  }

  destroy() {
    this.cancel();
    this.input.destroy();
    this.clearKeyDownTimer();
  }

  private onInputStart(e: MouseEvent | TouchEvent) {
    this.target = null;
    this.isPointerMoved = false;
    this.isObjectDragging = false;
    this.isKeepSelection = false;

    this.clearActivateTimer();
    this.pickCursor.update(this.input.pointer);

    if ((e instanceof MouseEvent && e.button === 0) || (e as TouchEvent).touches) {
      this.isStrokeMode = (e instanceof MouseEvent && e.button === 0 && e.ctrlKey);
      let isQuickActivate = (e instanceof MouseEvent && e.button === 0 && e.shiftKey);

      if (this.isStrokeMode || isQuickActivate) {
        this.isActive = true;
        this.pickCursor.active();
        this.pickCursor.disableAnimation();
        this.pickCursor.scale(1.0);
        requestAnimationFrame(() => this.pickCursor.scale(0.6));

        this.pointerDevice.isDragging = false;
        this.pickStart();

        if (this.isStrokeMode) {
          let target = e.target as HTMLElement;
          if (target.contains(this.gameObjectsElement)) {
            this.selection.excludeElement = document.body;
          } else {
            this.selection.excludeElement = null;
            this.pickObject(e);
          }
        }
      } else {
        if ((e as TouchEvent).touches) this.pickCursor.scale(3.5);
        let target = e.target as HTMLElement;
        if (this.gameObjectsElement.contains(target)) {
          this.target = target;
        }

        this.pickCursor.active();
        requestAnimationFrame(() => {
          if (this.pointerDevice.isDragging) {
            this.pickCursor.color(CursorColor.MAGNETIC, CursorColor.MAGNETIC_FILL);
          }
        });

        this.setActivateTimer();
        this.setKeyDownTimer();
      }
    } else {
      this.cancel();
    }
  }

  private onInputMove(e: MouseEvent | TouchEvent) {
    let isMultiTouch = 1 < (e as TouchEvent).touches?.length;
    let threshold = (e instanceof MouseEvent ? 3 : 12) ** 2;

    this.isObjectDragging = this.pointerDevice.isDragging;
    this.isPointerMoved = this.isPointerMoved || threshold < this.input.magnitude;
    this.isKeepSelection = this.isKeepSelection || this.isPointerMoved || this.isObjectDragging;

    if (this.keydownTimer != null) return;

    let isObjectGesture = this.target != null && this.isObjectDragging && this.isPointerMoved;
    let isTableGesture = this.activateTimer != null && this.isPointerMoved;
    if (isMultiTouch || isObjectGesture || isTableGesture) this.cancel();

    if (!this.isActive || (this.oncancelifneeded != null && this.oncancelifneeded())) return;
    this.pickCursor.update(this.input.pointer);
    this.pickCursor.scale(0);

    if (this.isStrokeMode) {
      if (e instanceof MouseEvent && e.ctrlKey) {
        let target = e.target as HTMLElement;
        if (target.contains(this.gameObjectsElement)) {
          this.selection.excludeElement = document.body;
        } else {
          this.pickObject(e);
        }
      }
    } else if (this.isPointerMoved) {
      this.pickRegion(e);
    }

    if (this.onpick) this.onpick();
  }

  private onInputEnd(e: MouseEvent | TouchEvent) {
    let threshold = (e instanceof MouseEvent ? 3 : 12) ** 2;

    this.isObjectDragging = this.pointerDevice.isDragging;
    this.isPointerMoved = this.isPointerMoved || threshold < this.input.magnitude;
    this.isKeepSelection = this.isKeepSelection || this.isPointerMoved || this.isObjectDragging;

    if (this.onend) this.onend();
    this.cancel();
  }

  private onKeydown(e: KeyboardEvent) {
    if (this.isActive && (!this.input.isGrabbing)) return;
    switch (e.key) {
      case 'Control':
        this.isStrokeMode = true;
      case 'Shift':
        this.clearActivateTimer();
        this.clearKeyDownTimer();

        this.target = null;
        this.isPointerMoved = false;
        this.isObjectDragging = false;
        this.isKeepSelection = false;

        this.isActive = true;
        this.pickCursor.update(this.input.pointer);
        this.pickCursor.active();
        this.pickCursor.disableAnimation();
        this.pickCursor.scale(0.6);
        requestAnimationFrame(() => this.pickCursor.scale(0.0));

        this.pointerDevice.isDragging = false;
        this.pickStart();
        break;
    }
  }

  private pickStart() {
    let event = new CustomEvent('pickstart', { detail: {}, bubbles: true });
    if (this.target) {
      this.target.dispatchEvent(event);
    } else {
      document.dispatchEvent(event);
    }

    if (this.onstart) this.onstart();
  }

  private pickObject(srcEvent: Event) {
    let target = srcEvent.target as HTMLElement;
    let event = new CustomEvent(
      'pickobject',
      {
        detail: { srcEvent: srcEvent, first: this.input.startPointer, last: this.input.pointer },
        bubbles: true
      });
    target.dispatchEvent(event);
  }

  private pickRegion(srcEvent: Event) {
    let first = this.input.startPointer;
    let last = this.input.pointer;
    let x = Math.min(first.x, last.x);
    let y = Math.min(first.y, last.y);
    let width = Math.abs(first.x - last.x);
    let height = Math.abs(first.y - last.y);

    this.pickArea.update(x, y, width, height);

    this.selection.clear();
    let event = new CustomEvent(
      'pickregion',
      {
        detail: { srcEvent: srcEvent, x: x, y: y, width: width, height: height },
        bubbles: true
      });
    document.dispatchEvent(event);
  }

  private setActivateTimer() {
    this.clearActivateTimer();

    this.activateTimer = setTimeout(() => {
      this.activateTimer = null;
      this.pickCursor.scale(0.6);
      this.isActive = true;

      this.pickStart();
    }, 850);
  }

  private clearActivateTimer() {
    this.isActive = false;
    if (this.activateTimer != null) {
      clearTimeout(this.activateTimer);
      this.activateTimer = null;
    }
    this.pickArea.deactive();
  }

  private setKeyDownTimer() {
    this.clearKeyDownTimer();
    this.keydownTimer = setTimeout(() => {
      this.keydownTimer = null;
    }, 66);
    document.body.addEventListener('keydown', this.callbackOnKeydown, false);
  }

  private clearKeyDownTimer() {
    if (this.keydownTimer != null) {
      clearTimeout(this.keydownTimer);
      this.keydownTimer = null;
    }
    document.body.removeEventListener('keydown', this.callbackOnKeydown, false);
  }
}

enum CursorColor {
  SELECTED = 'hsl(200, 100%, 50%)',
  MAGNETIC = 'hsl(45, 100%, 50%)',
  SELECTED_FILL = 'hsla(200, 100%, 95%, .7)',
  MAGNETIC_FILL = 'hsla(45, 100%, 95%, .7)',
}

class PickCursor {
  private width: number = 0;
  private height: number = 0;

  private readonly circleElement: SVGCircleElement;

  constructor(readonly targetElement: HTMLElement) {
    this.circleElement = this.targetElement.querySelector('circle');
    this.active();
    let rect = this.targetElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.deactive();
  }

  active() {
    this.deactive();
    this.targetElement.style.display = 'block';
  }

  deactive() {
    this.targetElement.style.display = null;
    this.targetElement.style.stroke = null;
    this.targetElement.style.scale = null;
    this.circleElement.style.animation = null;
    this.circleElement.style.fill = null;
  }

  scale(scale: number) {
    this.targetElement.style.scale = scale + '';
  }

  color(stroke: string, fill: string) {
    this.targetElement.style.stroke = stroke;
    this.circleElement.style.fill = fill;
  }

  disableAnimation() {
    this.circleElement.style.animation = 'none';
  }

  update(pointer: PointerCoordinate) {
    this.targetElement.style.left = pointer.x - (this.width / 2) + 'px';
    this.targetElement.style.top = pointer.y - (this.height / 2) + 'px';
  }
}

class PickArea {
  constructor(readonly targetElement: HTMLElement) { }

  update(x: number, y: number, width: number, height: number) {
    this.targetElement.style.left = x + 'px';
    this.targetElement.style.top = y + 'px';
    this.targetElement.style.width = width + 'px';
    this.targetElement.style.height = height + 'px';
    this.targetElement.style.display = 'block';
  }

  deactive() {
    this.targetElement.style.width = 0 + 'px';
    this.targetElement.style.height = 0 + 'px';
    this.targetElement.style.display = null;
  }
}
