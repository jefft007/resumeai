import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ResumeUploadComponent } from './resume-upload.component';

describe('ResumeUploadComponent', () => {

  let component: ResumeUploadComponent;
  let fixture: ComponentFixture<ResumeUploadComponent>;

  beforeEach(async () => {

    await TestBed.configureTestingModule({

      declarations: [
        ResumeUploadComponent
      ],

      imports: [
        HttpClientTestingModule,
        FormsModule
      ],

      schemas: [
        NO_ERRORS_SCHEMA
      ]

    }).compileComponents();

    fixture = TestBed.createComponent(ResumeUploadComponent);

    component = fixture.componentInstance;

    fixture.detectChanges();

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

});