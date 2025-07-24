import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FormSubmission {
  id: string;
  name: string;
  timestamp: Date;
  formData: any;
  status: 'draft' | 'submitted' | 'template';
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
      // If draft has content, also store in submissions list (update if already present)
      if (formData && Object.keys(formData).length > 0) {
        const currentSubmissions = this.submissionsSubject.value;
        // If this is a copy draft (created from a past submission or template), always create a new draft
        const isCopyDraft = draft.name.startsWith('Copy of ');
        let updatedSubmissions;
        if (!isCopyDraft) {
          const draftIndex = currentSubmissions.findIndex(sub => sub.id === draft.id);
          if (draftIndex !== -1) {
            // Update existing draft
            updatedSubmissions = [
              ...currentSubmissions.slice(0, draftIndex),
              draft,
              ...currentSubmissions.slice(draftIndex + 1)
            ];
          } else {
            // Add new draft
            updatedSubmissions = [...currentSubmissions, draft];
          }
        } else {
          // Always add as a new draft with a new id
          const newDraft = { ...draft, id: this.generateId(), timestamp: new Date() };
          updatedSubmissions = [...currentSubmissions, newDraft];
          // Also update current draft in memory/localStorage
          localStorage.setItem(this.DRAFT_KEY, JSON.stringify(newDraft));
          this.currentDraftSubject.next(newDraft);
        }
        this.saveSubmissions(updatedSubmissions);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  // Submit form (save as submitted)
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

    // Clear current draft
    this.clearCurrentDraft();

    return submissionId;
  }

  // Save as template
  saveAsTemplate(formData: any, name?: string): string {
    const templateId = this.generateId();
    const template: FormSubmission = {
      id: templateId,
      name: name || `Template ${new Date().toLocaleDateString()}`,
      timestamp: new Date(),
      formData: formData,
      status: 'template'
    };

    // Add to submissions list (templates are stored in the same list but filtered by status)
    const currentSubmissions = this.submissionsSubject.value;
    const updatedSubmissions = [...currentSubmissions, template];
    this.saveSubmissions(updatedSubmissions);

    return templateId;
  }



  // Load a past submission as new draft
  loadSubmissionAsDraft(submissionId: string): boolean {
    const submissions = this.submissionsSubject.value;
    const submission = submissions.find(sub => sub.id === submissionId);
    
    if (submission) {
      if (submission.status === 'draft') {
        // Set this draft as the current draft (no copy)
        try {
          localStorage.setItem(this.DRAFT_KEY, JSON.stringify(submission));
          this.currentDraftSubject.next(submission);
        } catch (error) {
          console.error('Error setting draft as current:', error);
        }
      } else {
        // For non-draft (submitted/template), create a new draft copy with a new id
        const newDraft = {
          ...submission,
          id: this.generateId(),
          status: 'draft' as 'draft',
          timestamp: new Date(),
          name: `Copy of ${submission.name}`
        };
        try {
          localStorage.setItem(this.DRAFT_KEY, JSON.stringify(newDraft));
          this.currentDraftSubject.next(newDraft);
        } catch (error) {
          console.error('Error creating draft copy:', error);
        }
      }
      return true;
    }
    return false;
  }

  // Get all submissions (all types)
  getSubmissions(): FormSubmission[] {
    return this.submissionsSubject.value;
  }

  // Get only templates
  getTemplates(): FormSubmission[] {
    return this.submissionsSubject.value.filter(sub => sub.status === 'template');
  }

  // Get only regular submissions (not templates)
  getRegularSubmissions(): FormSubmission[] {
    return this.submissionsSubject.value.filter(sub => sub.status === 'submitted');
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