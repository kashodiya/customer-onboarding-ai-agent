import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FormStorageService } from './services/form-storage.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, MatToolbarModule, MatDialogModule, MatSnackBarModule, NavigationComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Customer Onboarding';

  constructor(
    private router: Router,
    private formStorageService: FormStorageService
  ) {}

  onLoadSubmission(submissionId: string): void {
    // Set flag to indicate we're loading a template
    sessionStorage.setItem('isLoadingTemplate', 'true');
    
    // Load the template and navigate to form
    this.formStorageService.loadSubmissionAsDraft(submissionId);
    // Navigate to home to ensure the onboarding component is loaded
    this.router.navigate(['/']);
  }

  onNewForm(): void {
    // Clear current draft and navigate to home
    this.formStorageService.clearCurrentDraft();
    this.router.navigate(['/']);
  }

  onClearDraft(): void {
    // Clear current draft - the onboarding component will handle the UI update
    this.formStorageService.clearCurrentDraft();
  }

  get isAutosaving(): boolean {
    // This will need to be handled differently with router outlet
    return false;
  }
} 