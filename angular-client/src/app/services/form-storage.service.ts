import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FormSubmission {
  id: string;
  name: string;
  timestamp: Date;
  formData: any;
  status: 'draft' | 'submitted';
}

@Injectable({
  providedIn: 'root'
})
export class FormStorageService {
  private readonly STORAGE_KEY = 'onboarding_submissions';
  private readonly DRAFT_KEY = 'current_draft';
  
  private submissionsSubject = new BehaviorSubject<FormSubmission[]>([]);
  public submissions$ = this.submissionsSubject.asObservable();
  
  private currentDraftSubject = new BehaviorSubject<FormSubmission | null>(null);
  public currentDraft$ = this.currentDraftSubject.asObservable();
  
  constructor() {
    this.loadSubmissions();
    this.loadCurrentDraft();
  }

  // Load submissions from localStorage
  private loadSubmissions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const submissions = JSON.parse(stored).map((sub: any) => ({
          ...sub,
          timestamp: new Date(sub.timestamp)
        }));
        this.submissionsSubject.next(submissions);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  }

  // Save submissions to localStorage
  private saveSubmissions(submissions: FormSubmission[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(submissions));
      this.submissionsSubject.next(submissions);
    } catch (error) {
      console.error('Error saving submissions:', error);
    }
  }

  // Load current draft from localStorage
  private loadCurrentDraft(): void {
    try {
      const stored = localStorage.getItem(this.DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored);
        draft.timestamp = new Date(draft.timestamp);
        this.currentDraftSubject.next(draft);
      }
    } catch (error) {
      console.error('Error loading current draft:', error);
    }
  }

  // Save current draft to localStorage
  saveDraft(formData: any, name?: string): void {
    const draft: FormSubmission = {
      id: this.currentDraftSubject.value?.id || this.generateId(),
      name: name || this.currentDraftSubject.value?.name || 'Untitled Draft',
      timestamp: new Date(),
      formData: formData,
      status: 'draft'
    };

    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
      this.currentDraftSubject.next(draft);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  // Submit form (save as submitted and download JSON)
  submitForm(formData: any, name?: string): string {
    const submissionId = this.generateId();
    const submission: FormSubmission = {
      id: submissionId,
      name: name || `Submission ${new Date().toLocaleDateString()}`,
      timestamp: new Date(),
      formData: formData,
      status: 'submitted'
    };

    // Add to submissions list
    const currentSubmissions = this.submissionsSubject.value;
    const updatedSubmissions = [...currentSubmissions, submission];
    this.saveSubmissions(updatedSubmissions);

    // Download as JSON file
    this.downloadAsJson(submission);

    // Clear current draft
    this.clearCurrentDraft();

    return submissionId;
  }

  // Download submission as JSON file
  private downloadAsJson(submission: FormSubmission): void {
    const dataStr = JSON.stringify(submission, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    // Use submission name as filename, sanitized for file system
    const sanitizedName = submission.name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
    
    const exportFileDefaultName = `${sanitizedName || 'onboarding_form'}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  // Load a past submission as new draft
  loadSubmissionAsDraft(submissionId: string): boolean {
    const submissions = this.submissionsSubject.value;
    const submission = submissions.find(sub => sub.id === submissionId);
    
    if (submission) {
      this.saveDraft(submission.formData, `Copy of ${submission.name}`);
      return true;
    }
    return false;
  }

  // Get all submissions
  getSubmissions(): FormSubmission[] {
    return this.submissionsSubject.value;
  }

  // Get current draft
  getCurrentDraft(): FormSubmission | null {
    return this.currentDraftSubject.value;
  }

  // Clear current draft
  clearCurrentDraft(): void {
    localStorage.removeItem(this.DRAFT_KEY);
    this.currentDraftSubject.next(null);
  }

  // Delete a submission
  deleteSubmission(submissionId: string): void {
    const currentSubmissions = this.submissionsSubject.value;
    const updatedSubmissions = currentSubmissions.filter(sub => sub.id !== submissionId);
    this.saveSubmissions(updatedSubmissions);
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Import submission from JSON file
  importSubmission(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const submission: FormSubmission = JSON.parse(result);
          
          // Validate submission structure
          if (!submission.id || !submission.formData) {
            throw new Error('Invalid submission format');
          }

          // Convert timestamp back to Date object
          submission.timestamp = new Date(submission.timestamp);
          submission.status = 'submitted'; // Mark as submitted when imported
          
          // Add to submissions
          const currentSubmissions = this.submissionsSubject.value;
          const updatedSubmissions = [...currentSubmissions, submission];
          this.saveSubmissions(updatedSubmissions);
          
          resolve(true);
        } catch (error) {
          console.error('Error importing submission:', error);
          reject(false);
        }
      };
      reader.readAsText(file);
    });
  }
} 