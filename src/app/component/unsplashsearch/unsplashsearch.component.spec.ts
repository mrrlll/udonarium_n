import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnsplashsearchComponent } from './unsplashsearch.component';

describe('UnsplashsearchComponent', () => {
  let component: UnsplashsearchComponent;
  let fixture: ComponentFixture<UnsplashsearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnsplashsearchComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnsplashsearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
