import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormStorageService } from '../../services/form-storage.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule
  ],
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit {
  submissionId: string = '';
  currentSubmission: any = null;
  templateSaved: boolean = false; // Track if template has been saved
  
  progressSteps = [
    { id: 'submission', label: 'Submission', icon: 'assignment', completed: true, current: false },
    { id: 'validation', label: 'Validation', icon: 'verified', completed: false, current: true },
    { id: 'approval', label: 'Approval', icon: 'approval', completed: false, current: false },
    { id: 'fileTransfer', label: 'File Transfer', icon: 'cloud_upload', completed: false, current: false }
  ];

  constructor(
    private router: Router,
    private formStorageService: FormStorageService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Get submission ID from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    
    if (state && state['submissionId']) {
      this.submissionId = state['submissionId'];
      this.loadSubmissionDetails();
    } else {
      // Fallback - try to get the most recent submission
      const submissions = this.formStorageService.getRegularSubmissions();
      if (submissions.length > 0) {
        // Sort by timestamp and get the most recent
        const mostRecent = submissions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        this.submissionId = mostRecent.id;
        this.currentSubmission = mostRecent;
        this.checkIfTemplateExists();
      } else {
        // No submissions found, redirect to home
        this.router.navigate(['/']);
      }
    }
  }

  private loadSubmissionDetails() {
    const submissions = this.formStorageService.getSubmissions();
    this.currentSubmission = submissions.find(sub => sub.id === this.submissionId);
    this.checkIfTemplateExists();
  }

  private checkIfTemplateExists() {
    if (!this.currentSubmission) return;
    
    // Check if a template already exists for this submission
    const existingTemplates = this.formStorageService.getTemplates();
    const templateExists = existingTemplates.some(template => 
      template.name === this.currentSubmission.name ||
      this.isFormDataEqual(template.formData, this.currentSubmission.formData)
    );
    
    this.templateSaved = templateExists;
  }

  private isFormDataEqual(data1: any, data2: any): boolean {
    return JSON.stringify(data1) === JSON.stringify(data2);
  }

  onSaveAsTemplate() {
    if (this.currentSubmission && !this.templateSaved) {
      // Save as template with "Template" prefix
      const templateName = `${this.currentSubmission.name}`;
      this.formStorageService.saveAsTemplate(this.currentSubmission.formData, templateName);
      
      // Mark as saved and show success message
      this.templateSaved = true;
      this.snackBar.open('Submission saved as template successfully!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }
  }

  onStartNewForm() {
    this.router.navigate(['/'], { 
      state: { clearDraft: true } 
    });
  }

  onGoHome() {
    this.router.navigate(['/']);
  }

  getStepClass(step: any): string {
    if (step.completed) return 'completed';
    if (step.current) return 'current';
    return 'pending';
  }
} 