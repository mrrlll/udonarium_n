import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PanelOption, PanelService } from 'service/panel.service';

import { UnsplashService } from 'service/unsplash.service';

@Component({
  selector: 'app-unsplashsearch',
  templateUrl: './unsplashsearch.component.html',
  styleUrls: ['./unsplashsearch.component.css']
})
export class UnsplashsearchComponent implements OnInit {
  photos: any[] = [];
  constructor(private changeDetector: ChangeDetectorRef, private panelService: PanelService, private unsplashService: UnsplashService) {}
  ngOnInit() {
    this.unsplashService.searchPhotos('nature').subscribe(data => { this.photos = data.results;})
  }
}
