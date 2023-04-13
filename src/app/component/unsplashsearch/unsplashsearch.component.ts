import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PanelOption, PanelService } from 'service/panel.service';

import axios from 'axios'

@Component({
  selector: 'app-unsplashsearch',
  templateUrl: './unsplashsearch.component.html',
  styleUrls: ['./unsplashsearch.component.css']
})
export class UnsplashsearchComponent implements OnInit {
  constructor(private changeDetector: ChangeDetectorRef, private panelService: PanelService) {}
  ngOnInit() {
    Promise.resolve().then(() => {
      this.panelService.title = 'Unsplash画像検索';
    });
  }

  unsplashsearch() {
    console.log('a')
  }
}
