import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { NavigationComponent } from './components/navigation/navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule, OnboardingComponent, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('onboardingComponent') onboardingComponent!: OnboardingComponent;
  
  title = 'Customer Onboarding';

  onLoadSubmission(submissionId: string): void {
    // The FormStorageService already handles loading the submission as a draft
    // We just need to refresh the form in the onboarding component
    if (this.onboardingComponent) {
      this.onboardingComponent.refreshForm();
    }
  }

  onNewForm(): void {
    if (this.onboardingComponent) {
      this.onboardingComponent.createNewForm();
    }
  }

  onClearDraft(): void {
    if (this.onboardingComponent) {
      this.onboardingComponent.clearForm();
    }
  }

  get isAutosaving(): boolean {
    const autosaving = this.onboardingComponent?.isAutosaving || false;
    return autosaving;
  }
} 