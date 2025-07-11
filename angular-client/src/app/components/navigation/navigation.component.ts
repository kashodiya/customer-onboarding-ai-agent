import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { FormStorageService, FormSubmission } from '../../services/form-storage.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <mat-toolbar color="primary" class="navigation-toolbar">
      <span class="app-title">Customer Onboarding</span>
      
      <div class="toolbar-spacer"></div>
      
      <!-- Past Submissions Dropdown -->
      <button mat-button [matMenuTriggerFor]="submissionsMenu" class="submissions-button">
        <mat-icon>history</mat-icon>
        <span>Past Submissions</span>
        <span matBadge="{{(submissions$ | async)?.length || 0}}" matBadgeOverlap="false" 
              matBadgeColor="accent" matBadgeSize="small" class="badge-container"></span>
      </button>
      
      <mat-menu #submissionsMenu="matMenu" class="submissions-menu">
        <div class="menu-header">
          <h3>Past Submissions</h3>
        </div>
        
        <div *ngIf="(submissions$ | async)?.length === 0" class="no-submissions">
          <mat-icon>inbox</mat-icon>
          <span>No submissions yet</span>
        </div>
        
        <button mat-menu-item 
                *ngFor="let submission of submissions$ | async" 
                (click)="onLoadSubmission(submission.id)"
                class="submission-item">
          <div class="submission-content">
            <div class="submission-header">
              <mat-icon class="submission-icon">
                {{submission.status === 'draft' ? 'draft' : 'description'}}
              </mat-icon>
              <span class="submission-name">{{submission.name}}</span>
            </div>
            <div class="submission-meta">
              <span class="submission-date">{{submission.timestamp | date:'short'}}</span>
              <span class="submission-status" [class]="submission.status">
                {{submission.status}}
              </span>
            </div>
          </div>
        </button>
        
        <mat-divider></mat-divider>
        
        <button mat-menu-item (click)="onImportSubmission()" class="import-button">
          <mat-icon>upload_file</mat-icon>
          <span>Import Submission</span>
        </button>
        
        <button mat-menu-item (click)="onClearDraft()" class="clear-draft-button">
          <mat-icon>clear</mat-icon>
          <span>Clear Current Draft</span>
        </button>
      </mat-menu>
      
      <!-- New Form Button -->
      <button mat-button (click)="onNewForm()" class="new-form-button">
        <mat-icon>add</mat-icon>
        <span>New Form</span>
      </button>
    </mat-toolbar>
    
    <!-- Hidden file input for importing -->
    <input #fileInput type="file" accept=".json" (change)="onFileSelected($event)" style="display: none;">
  `,
  styles: [`
    .navigation-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .app-title {
      font-size: 20px;
      font-weight: 600;
    }
    
    .toolbar-spacer {
      flex: 1 1 auto;
    }
    
    .submissions-button {
      margin-right: 16px;
    }
    
    .badge-container {
      margin-left: 8px;
    }
    
    .submissions-menu {
      max-width: 400px;
      min-width: 300px;
    }
    
    .menu-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .menu-header h3 {
      margin: 0;
      color: #1976d2;
      font-size: 16px;
    }
    
    .no-submissions {
      display: flex;
      align-items: center;
      padding: 16px;
      color: #666;
      font-style: italic;
    }
    
    .no-submissions mat-icon {
      margin-right: 8px;
      color: #999;
    }
    
    .submission-item {
      width: 100%;
      height: auto;
      padding: 12px 16px;
    }
    
    .submission-content {
      width: 100%;
      text-align: left;
    }
    
    .submission-header {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .submission-icon {
      margin-right: 8px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .submission-name {
      font-weight: 500;
      flex: 1;
    }
    
    .submission-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #666;
    }
    
    .submission-status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .submission-status.draft {
      background: #fff3e0;
      color: #f57c00;
    }
    
    .submission-status.submitted {
      background: #e8f5e8;
      color: #2e7d32;
    }
    
    .import-button, .clear-draft-button {
      color: #1976d2;
    }
    
    .new-form-button {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .new-form-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class NavigationComponent implements OnInit {
  @Output() loadSubmission = new EventEmitter<string>();
  @Output() newForm = new EventEmitter<void>();
  @Output() clearDraft = new EventEmitter<void>();

  submissions$: Observable<FormSubmission[]>;

  constructor(private formStorageService: FormStorageService) {
    this.submissions$ = this.formStorageService.submissions$;
  }

  ngOnInit(): void {
    // Component initialization
  }

  onLoadSubmission(submissionId: string): void {
    if (this.formStorageService.loadSubmissionAsDraft(submissionId)) {
      this.loadSubmission.emit(submissionId);
    }
  }

  onNewForm(): void {
    this.newForm.emit();
  }

  onClearDraft(): void {
    this.formStorageService.clearCurrentDraft();
    this.clearDraft.emit();
  }

  onImportSubmission(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      this.formStorageService.importSubmission(file)
        .then(() => {
          console.log('Submission imported successfully');
        })
        .catch(() => {
          console.error('Failed to import submission');
        });
    }
    
    // Reset file input
    event.target.value = '';
  }
} 