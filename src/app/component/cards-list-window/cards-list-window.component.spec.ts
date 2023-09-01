import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsListWindowComponent } from './cards-list-window.component';

describe('CardsListWindowComponent', () => {
  let component: CardsListWindowComponent;
  let fixture: ComponentFixture<CardsListWindowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CardsListWindowComponent]
    });
    fixture = TestBed.createComponent(CardsListWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
