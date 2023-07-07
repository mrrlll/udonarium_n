import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCharacterGenerateWindowComponent } from './game-character-generate-window.component';

describe('GameCharacterGenerateWindowComponent', () => {
  let component: GameCharacterGenerateWindowComponent;
  let fixture: ComponentFixture<GameCharacterGenerateWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GameCharacterGenerateWindowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameCharacterGenerateWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
