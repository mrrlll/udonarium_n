import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class AppConfigCustomService {
  isViewer: Subject<boolean> = new Subject();
  isViewerOnly: Subject<boolean> = new Subject();
  public dataViewer: boolean;

  constructor() {
    this.isViewer.next(false);
    this.dataViewer = false;
    this.isViewerOnly.next(false);
  }

  get isViewer$() {
    return this.isViewer.asObservable();
  }

  get isViewerOnly$() {
    return this.isViewerOnly.asObservable();
  }
}
