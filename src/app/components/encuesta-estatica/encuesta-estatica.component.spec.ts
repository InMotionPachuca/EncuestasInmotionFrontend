import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EncuestaEstaticaComponent } from './encuesta-estatica.component';

describe('EncuestaEstaticaComponent', () => {
  let component: EncuestaEstaticaComponent;
  let fixture: ComponentFixture<EncuestaEstaticaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EncuestaEstaticaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EncuestaEstaticaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
