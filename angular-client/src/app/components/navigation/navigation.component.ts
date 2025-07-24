import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormStorageService, FormSubmission } from '../../services/form-storage.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

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
        MatDividerModule,
        MatProgressSpinnerModule,
        MatTooltipModule
    ],
    templateUrl: './navigation.component.html',
    styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  @Output() loadSubmission = new EventEmitter<string>();
  @Output() newForm = new EventEmitter<void>();
  @Output() clearDraft = new EventEmitter<void>();
  @Input() isAutosaving: boolean = false;

  templates$: Observable<FormSubmission[]>;
  history$: Observable<FormSubmission[]>;
  currentDraftId: string | null = null;

  constructor(
    private formStorageService: FormStorageService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Only show templates in the navigation
    this.templates$ = this.formStorageService.submissions$.pipe(
      map(submissions => submissions.filter(sub => sub.status === 'template'))
    );
    // Show only regular submissions (history)
    this.history$ = this.formStorageService.submissions$.pipe(
      map(submissions => submissions.filter(sub => sub.status === 'submitted' || sub.status === 'draft'))
    );
  }

  ngOnInit(): void {
    // Subscribe to current draft changes
    this.formStorageService.currentDraft$.subscribe(draft => {
      this.currentDraftId = draft ? draft.id : null;
    });
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

  onDeleteSubmission(submissionId: string, submissionName: string, event: Event): void {
    // Prevent the menu item click from propagating
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Template',
        message: `Are you sure you want to delete "${submissionName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.formStorageService.deleteSubmission(submissionId);
        this.snackBar.open('Template deleted successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  onDeleteHistorySubmission(submissionId: string, submissionName: string, event: Event): void {
    // Prevent the menu item click from propagating
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Submission',
        message: `Are you sure you want to delete "${submissionName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.formStorageService.deleteSubmission(submissionId);
        this.snackBar.open('Submission deleted successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  getDrafts(submissions: FormSubmission[]): FormSubmission[] {
    return submissions.filter(sub => sub.status === 'draft');
  }

  getPastSubmissions(submissions: FormSubmission[]): FormSubmission[] {
    return submissions.filter(sub => sub.status === 'submitted');
  }
} 