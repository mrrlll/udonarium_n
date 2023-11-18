import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameTableMaskInventoryComponent } from './game-table-mask-inventory.component';

describe('GameTableMaskInventoryComponent', () => {
  let component: GameTableMaskInventoryComponent;
  let fixture: ComponentFixture<GameTableMaskInventoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GameTableMaskInventoryComponent]
    });
    fixture = TestBed.createComponent(GameTableMaskInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
