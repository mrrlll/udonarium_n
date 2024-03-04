import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsaneSkillTableComponent } from './insane-skill-table.component';

describe('InsaneSkillTableComponent', () => {
  let component: InsaneSkillTableComponent;
  let fixture: ComponentFixture<InsaneSkillTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsaneSkillTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InsaneSkillTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
