import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ChatService, ChatMessage, FormField } from '../../services/chat.service';
import { FormStorageService, FormSubmission } from '../../services/form-storage.service';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AutosaveService } from '../../services/autosave.service';

@Component({
    selector: 'app-onboarding',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        MatDividerModule,
        MatCheckboxModule,
        MatRadioModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatSnackBarModule
    ],
    templateUrl: './onboarding.component.html',
    styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessagesContainer') private chatMessagesContainer!: ElementRef;
  
  chatMessages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  isFieldContextLoading = false; // Add a lock for field context requests
  messageCounter = 0;
  chatExpanded = true;
  smartGuideEnabled = true; // Smart Guide is enabled by default
  showWelcomeButtons = false; // Show buttons after welcome message
  private shouldScrollToBottom = false;
  isSubmitting = false; // Add loading state for form submission
  hasUnreadMessages = false; // Track unread messages for notification indicator
  // isAutosaving = false; // Now handled by AutosaveService
  
  onboardingForm: FormGroup;
  formUpdatesSubscription?: Subscription;
  draftSubscription?: Subscription;
  isLoadingTemplate: boolean = false; // Track if we're loading a template
  private isApplyingDraft: boolean = false; // Prevent autosave during programmatic form loads

  // Data arrays for dropdowns
  internalExternalOptions = ['Internal', 'External'];
  environmentOptions = ['DEV', 'QA', 'PROD'];
  regionOptions = ['NORTH', 'SOUTH'];
  backupRegionOptions = ['NORTH', 'SOUTH', 'None'];
  networkLocationOptions = ['On Site', 'Cloud'];

  constructor(
    @Inject(Router) private router: Router,
    private chatService: ChatService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private formStorageService: FormStorageService,
    private autosaveService: AutosaveService
  ) {
    this.onboardingForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      // Form Title - empty with placeholder
      formTitle: [''],
      
      // Section 1: Existing Flows
      existingFlows: this.formBuilder.group({
        sourceApplicationName: ['', Validators.required],
        targetApplicationName: ['', Validators.required],
        isUsingIODS: [false], // Checkbox - no required validator needed
        iodsDetails: this.formBuilder.group({
          oldIodsId: [''],
          onSiteServerNames: [''],
          fileName: [''],
          fileType: [''],
          iodsMailbox: [''],
          prePostTransferProcesses: ['']
        })
      }),

      // Section 2: Application Information
      applicationInfo: this.formBuilder.group({
        systemName: ['', Validators.required],
        internalOrExternal: ['', Validators.required],
        supportedProtocols: ['', Validators.required],
        platform: ['', Validators.required],
        environments: this.formBuilder.array([]),
        primaryRegion: ['', Validators.required],
        backupRegion: ['', Validators.required],
        isExternalApplication: [false] // Add the missing radio button control
      }),

      // Section 3: Network Boundary and Cloud Boundary
      networkCloudInfo: this.formBuilder.group({
        networkLocation: ['', Validators.required],
        cloudDetails: this.formBuilder.group({
          awsAccountName: [''],
          awsAccountNumber: [''],
          cloudRegion: [''],
          awsCloudId: [''],
          serverName: [''],
          ipOrSubnet: [''],
          applicationTarget: ['']
        }),
        requiresExternalVendorConnection: [false] // Checkbox - no required validator needed
      }),

      // Section 4: File Transfer Information (Cloud)
      fileTransferInfo: this.formBuilder.group({
        direction: [''], // 'outbound' or 'inbound'
        sourceAwsAccount: [''],
        sourceBucketArn: [''],
        sourceArchiveBucket: [''],
        sourceArchivePrefix: [''],
        targetBucket: [''],
        targetPrefix: ['']
      }),

      // Section 5: Environment Information
      environmentInfo: this.formBuilder.group({
        customerEnvironments: ['', Validators.required],
        cloudEnvironmentMapping: this.formBuilder.group({
          development: ['', Validators.required],
          qualityAssurance: ['', Validators.required],
          production: ['', Validators.required]
        })
      }),

      // Section 6: Business Information
      businessInfo: this.formBuilder.group({
        implementationDeadline: [''],
        contacts: this.formBuilder.group({
          businessContactSource: ['', Validators.required],
          technicalContactSource: ['', Validators.required],
          businessContactTarget: ['', Validators.required],
          technicalContactTarget: ['', Validators.required],
          vendorContact: ['']
        })
      })
    });
  }

  ngOnInit() {
    // Check if we're loading a template
    this.isLoadingTemplate = sessionStorage.getItem('isLoadingTemplate') === 'true';
    if (this.isLoadingTemplate) {
      sessionStorage.removeItem('isLoadingTemplate'); // Clear flag
    }
    
    this.initializeEnvironmentsArray();
    this.subscribeToFormUpdates();
    this.setupAutosave();
    
    // Subscribe to draft changes first
    this.subscribeToDraftChanges();
    
    // Check if we should clear draft (coming from progress screen)
    try {
      const navigation = this.router.getCurrentNavigation();
      const state = navigation?.extras?.state;
      if (state && state['clearDraft']) {
        this.formStorageService.clearCurrentDraft();
        this.onboardingForm.reset();
        this.onboardingForm.markAsPristine();
      }
    } catch (error) {
      console.log('No navigation state available, continuing normally');
    }
    
    // Always start the agent to show welcome message and assistance buttons
    this.startAgent();
    
    // Load existing draft if available (this will happen after the agent starts)
    const currentDraft = this.formStorageService.getCurrentDraft();
    if (currentDraft && this.hasFormContent(currentDraft.formData)) {
      // Load the draft data but don't prevent the welcome message
      this.loadFormData(currentDraft.formData, currentDraft.name);
      this.addMessage(`Draft "${currentDraft.name}" loaded automatically.`, false);
    }
  }

  ngOnDestroy() {
    if (this.formUpdatesSubscription) {
      this.formUpdatesSubscription.unsubscribe();
    }
    if (this.draftSubscription) {
      this.draftSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessagesContainer) {
        this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private initializeEnvironmentsArray() {
    const environmentsArray = this.onboardingForm.get('applicationInfo.environments') as FormArray;
    this.environmentOptions.forEach(() => {
      environmentsArray.push(this.formBuilder.control(false));
    });
  }

  get environmentsFormArray() {
    return this.onboardingForm.get('applicationInfo.environments') as FormArray<FormControl>;
  }

  get isUsingIODS() {
    return this.onboardingForm.get('existingFlows.isUsingIODS')?.value;
  }

  get isCloudLocation() {
    return this.onboardingForm.get('networkCloudInfo.networkLocation')?.value === 'Cloud';
  }

  get isExternalApplication() {
    return this.onboardingForm.get('applicationInfo.internalOrExternal')?.value === 'External';
  }

  get fileTransferDirection() {
    return this.onboardingForm.get('fileTransferInfo.direction')?.value;
  }

  get hasOutbound() {
    return this.fileTransferDirection === 'outbound';
  }

  get hasInbound() {
    return this.fileTransferDirection === 'inbound';
  }

  get requiresExternalVendorConnection() {
    return this.onboardingForm.get('networkCloudInfo.requiresExternalVendorConnection')?.value;
  }

  startAgent() {
    // Include current form state in case user has already filled some fields manually
    const currentFormData = this.getCompleteFormData();
    
    this.chatService.startAgent(currentFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
        // Use the backend's explicit flag instead of keyword detection
        this.showWelcomeButtons = response.showAssistanceButtons || false;
      },
      error: (error) => {
        console.error('Error starting agent:', error);
        this.addMessage('Error connecting to AI agent. Please check if the backend is running.', false);
      }
    });
  }

  subscribeToFormUpdates() {
    this.formUpdatesSubscription = this.chatService.getFormUpdates().subscribe({
      next: (updates) => {
        try {
          // updates is already parsed, no need for JSON.parse()
          if (updates && updates.name && updates.value !== undefined) {
            this.updateNestedFormValue(updates.name, updates.value);
          }
        } catch (error) {
          console.error('Error processing form updates:', error);
        }
      }
    });
  }

  private updateNestedFormValue(path: string, value: any) {
    const control = this.onboardingForm.get(path);
    if (control) {
      // Special handling for environments array
      if (path === 'applicationInfo.environments' && Array.isArray(value)) {
        const environmentsArray = control as FormArray;
        // Reset all checkboxes to false first
        for (let i = 0; i < environmentsArray.length; i++) {
          environmentsArray.at(i).setValue(false);
        }
        // Set selected environments to true
        value.forEach((envName: string) => {
          const index = this.environmentOptions.indexOf(envName);
          if (index !== -1 && index < environmentsArray.length) {
            environmentsArray.at(index).setValue(true);
          }
        });
      } 
      // Special handling for date fields to avoid timezone issues
      else if (path === 'businessInfo.implementationDeadline' && typeof value === 'string') {
        try {
          // Handle various date formats more flexibly
          let parsedDate: Date | null = null;
          
          // First try to parse as ISO date (YYYY-MM-DD) to avoid timezone issues
          const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (isoMatch) {
            const [, year, month, day] = isoMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            // For other formats, parse normally then adjust to local date
            const tempDate = new Date(value);
            if (!isNaN(tempDate.getTime())) {
              // If parsing succeeded, create local date to avoid timezone conversion
              parsedDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());
            } else {
              // If parsing failed, try manual parsing of common formats
              const dateFormats = [
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
                /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or M-D-YYYY
                /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
                /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/ // MM.DD.YYYY or M.D.YYYY
              ];
              
              for (const format of dateFormats) {
                const match = value.match(format);
                if (match) {
                  if (format.source.startsWith('(\\d{4})')) {
                    // YYYY/MM/DD format
                    const [, year, month, day] = match;
                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  } else {
                    // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY formats
                    const [, month, day, year] = match;
                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  }
                  break;
                }
              }
            }
          }
          
          if (parsedDate) {
            control.setValue(parsedDate);
          } else {
            console.warn(`Could not parse date: ${value}`);
            control.setValue(value); // Set as string if parsing fails
          }
        } catch (error) {
          console.warn(`Error parsing date ${value}:`, error);
          control.setValue(value); // Fallback to original value
        }
      } 
      else {
        control.setValue(value);
      }
    }
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isLoading) return; // Prevent if already loading

    this.addMessage(this.newMessage, true);
    this.isLoading = true;

    // Get current form state
    const currentFormData = this.getCompleteFormData();

    this.chatService.askAgent(this.newMessage, currentFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.addMessage('Error sending message. Please check if the backend is running.', false);
        this.isLoading = false;
      }
    });

    this.newMessage = '';
  }

  onFieldFocus(fieldPath: string, fieldLabel: string) {
    // Only provide context in Smart Guide mode
    if (!this.smartGuideEnabled || this.isFieldContextLoading) return; // Prevent if already loading
    // Suppress chat for the form title field
    if (fieldPath === 'formTitle') return;
    this.isFieldContextLoading = true;
    const fieldData: FormField = { name: fieldPath, value: fieldLabel };
    const completeFormData = this.getCompleteFormData();
    this.chatService.getFieldContext(fieldData, completeFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
        this.isFieldContextLoading = false;
      },
      error: (error) => {
        console.error('Error getting field context:', error);
        this.isFieldContextLoading = false;
      }
    });
  }

  onFieldChange(fieldPath: string, value: any) {
    // This method now only handles form updates, no AI interaction
    if (value === null || value === undefined) return;
    // Form value updates are handled automatically by Angular reactive forms
  }

  onEnvironmentChange() {
    const selectedEnvironments = this.environmentsFormArray.value
      .map((checked: boolean, idx: number) => checked ? this.environmentOptions[idx] : null)
      .filter((env: string | null) => env !== null);
    
    this.onFieldChange('applicationInfo.environments', selectedEnvironments);
  }

  onSmartGuideToggle(enabled: boolean) {
    this.smartGuideEnabled = enabled;
    
    if (enabled) {
      this.addMessage('Great! Start filling out the form and I\'ll assist you along the way.', false);
    } else {
      this.addMessage('Smart Guide disabled. If you need assistance, feel free to ask me a question or switch Smart Guide back on.', false);
    }
  }

  private getCompleteFormData(): any {
    const formValue = this.onboardingForm.value;
    
    // Exclude formTitle from the data - it's only for filename
    const { formTitle, ...dataWithoutTitle } = formValue;
    
    // Clean up the form data and handle special cases
    const cleanedData = {
      ...dataWithoutTitle,
      // Convert environment array to selected environment names
      applicationInfo: {
        ...dataWithoutTitle.applicationInfo,
        environments: this.environmentsFormArray.value
          .map((checked: boolean, idx: number) => checked ? this.environmentOptions[idx] : null)
          .filter((env: string | null) => env !== null)
      }
    };

    return cleanedData;
  }

  private addMessage(text: string, isUser: boolean) {
    const message: ChatMessage = {
      id: ++this.messageCounter,
      text: text,
      isUser: isUser,
      timestamp: new Date()
    };
    this.chatMessages.push(message);
    this.shouldScrollToBottom = true;
    
    // Mark as unread if chat is collapsed and message is from AI
    if (!this.chatExpanded && !isUser) {
      this.hasUnreadMessages = true;
    }
  }

  onEnterKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleChat() {
    this.chatExpanded = !this.chatExpanded;
    
    // Clear unread messages when expanding chat
    if (this.chatExpanded) {
      this.hasUnreadMessages = false;
      this.shouldScrollToBottom = true;
    }
  }

  onWelcomeButtonClick(wantsAssistance: boolean) {
    this.showWelcomeButtons = false;
    this.smartGuideEnabled = wantsAssistance;
    this.onSmartGuideToggle(wantsAssistance);
  }

  // Setup autosave functionality
  private setupAutosave(): void {
    this.onboardingForm.valueChanges
      .pipe(
        debounceTime(2000), // Wait 2 seconds after user stops typing
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.autosave();
      });

    // Trigger autosave with debounce when the draft name changes
    this.onboardingForm.get('formTitle')?.valueChanges
      .pipe(debounceTime(2000), distinctUntilChanged())
      .subscribe(() => {
        this.autosave();
      });
  }

  // Autosave current form data
  private autosave(): void {
    // Do not autosave if we're programmatically applying a draft
    if (this.isApplyingDraft) {
      return;
    }

    const formTitleRaw = this.onboardingForm.get('formTitle')?.value ?? '';
    const titleForDraft = (typeof formTitleRaw === 'string' ? formTitleRaw : String(formTitleRaw)).trim() || 'Untitled Draft';
    const formData = this.getCompleteFormData();

    // If nothing has changed compared to the currently saved draft, skip saving
    const currentDraft = this.formStorageService.getCurrentDraft();
    const isSameTitle = currentDraft?.name === titleForDraft;
    const isSameData = currentDraft ? JSON.stringify(currentDraft.formData) === JSON.stringify(formData) : false;
    if (!this.onboardingForm.dirty && isSameTitle && isSameData) {
      return;
    }

    // Only save if there is meaningful content
    const hasTitleContent = titleForDraft !== 'Untitled Draft';
    const hasOtherContent = this.hasFormContent(formData);
    if (!(hasTitleContent || hasOtherContent)) {
      return;
    }

    this.autosaveService.setAutosaving(true);
    this.formStorageService.saveDraft(formData, titleForDraft);

    // Mark as pristine after saving to avoid repeated autosaves without changes
    this.onboardingForm.markAsPristine();

    // Hide autosaving indicator after a longer delay for visibility
    setTimeout(() => {
      this.autosaveService.setAutosaving(false);
    }, 2000);
  }

  // Check if form has meaningful content (current form or provided data)
  private hasFormContent(formData?: any): boolean {
    const data = formData || this.getCompleteFormData();
    
    // Handle null/undefined
    if (data === null || data === undefined) {
      return false;
    }

    // Handle strings - meaningful if not empty after trimming
    if (typeof data === 'string') {
      return data.trim().length > 0;
    }

    // Handle numbers - meaningful if not 0 (though 0 could be meaningful in some contexts)
    if (typeof data === 'number') {
      return data !== 0;
    }

    // Handle booleans - meaningful if true (false is typically default)
    if (typeof data === 'boolean') {
      return data === true;
    }

    // Handle dates - meaningful if it's a valid date
    if (data instanceof Date) {
      return !isNaN(data.getTime());
    }

    // Handle arrays - meaningful if not empty and contains meaningful values
    if (Array.isArray(data)) {
      return data.length > 0 && data.some(item => this.hasFormContent(item));
    }

    // Handle objects - meaningful if any property has meaningful value
    if (typeof data === 'object') {
      return Object.values(data).some(prop => this.hasFormContent(prop));
    }

    // For any other type, consider it meaningful if it exists
    return true;
  }

  // Load current draft if exists
  private loadCurrentDraft(): boolean {
    const currentDraft = this.formStorageService.getCurrentDraft();
    if (currentDraft) {
      // Check if the draft has meaningful content using the consolidated function
      if (this.hasFormContent(currentDraft.formData)) {
        this.loadFormData(currentDraft.formData, currentDraft.name);
        this.addMessage(`Draft "${currentDraft.name}" loaded automatically.`, false);
        // Don't show assistance buttons when loading meaningful content
        this.showWelcomeButtons = false;
        return true; // Meaningful draft was loaded
      } else {
        // Clear empty draft
        this.formStorageService.clearCurrentDraft();
        // Don't set showWelcomeButtons here - let startAgent handle it
        return false; // No meaningful draft loaded
      }
    }
    return false; // No draft found
  }

  // Load form data into the form
  private loadFormData(formData: any, titleName?: string): void {
    this.isApplyingDraft = true;
    try {
      // Apply values without emitting events to avoid triggering autosave
      this.onboardingForm.patchValue(formData, { emitEvent: false });

      // Set the form title if provided
      if (titleName) {
        this.onboardingForm.patchValue({ formTitle: titleName }, { emitEvent: false });
      }

      // Handle environments array specially
      if (formData.applicationInfo?.environments) {
        const environmentsArray = this.onboardingForm.get('applicationInfo.environments') as FormArray;
        environmentsArray.clear();
        this.environmentOptions.forEach((env) => {
          const isSelected = formData.applicationInfo.environments.includes(env);
          environmentsArray.push(this.formBuilder.control(isSelected));
        });
      }

      // Ensure no valueChanges emission from validity recalculation
      this.onboardingForm.updateValueAndValidity({ emitEvent: false });
    } finally {
      // After programmatic load, consider the form pristine
      this.onboardingForm.markAsPristine();
      this.isApplyingDraft = false;
    }
  }

  // Subscribe to draft changes to handle template loading
  private subscribeToDraftChanges(): void {
    this.draftSubscription = this.formStorageService.currentDraft$.subscribe(draft => {
      if (draft) {
        // Avoid redundant reloads if the current form already matches the draft
        const currentFormData = this.getCompleteFormData();
        const currentTitleRaw = this.onboardingForm.get('formTitle')?.value ?? '';
        const currentTitle = (typeof currentTitleRaw === 'string' ? currentTitleRaw : String(currentTitleRaw)).trim() || 'Untitled Draft';
        const sameTitle = draft.name === currentTitle;
        const sameData = JSON.stringify(draft.formData) === JSON.stringify(currentFormData);
        if (!(sameTitle && sameData)) {
          this.loadFormData(draft.formData, draft.name);
        }

        // Only show message if we're actively loading a template
        if (this.isLoadingTemplate) {
          this.addMessage(`Template "${draft.name}" loaded successfully.`, false);
          this.isLoadingTemplate = false; // Reset flag after showing message
        }
      } else {
        this.resetForm();
      }
    });
  }

  // Reset form to initial state
  private resetForm(): void {
    this.onboardingForm.reset();
    this.onboardingForm.markAsPristine();
    
    // Reinitialize the environments array
    const environmentsArray = this.onboardingForm.get('applicationInfo.environments') as FormArray;
    environmentsArray.clear();
    this.initializeEnvironmentsArray();
  }

  // Refresh form from current draft
  refreshForm(): void {
    const currentDraft = this.formStorageService.getCurrentDraft();
    if (currentDraft) {
      this.loadFormData(currentDraft.formData, currentDraft.name);
      this.addMessage(`Form refreshed with "${currentDraft.name}".`, false);
    }
  }

  createNewForm(): void {
    this.formStorageService.clearCurrentDraft();
    this.onboardingForm.reset();
    // Don't set default title - let placeholder handle it
    this.onboardingForm.markAsPristine();
    this.addMessage('New form created. Previous draft cleared.', false);
  }

  clearForm(): void {
    this.onboardingForm.reset();
    this.onboardingForm.markAsPristine();
    this.addMessage('Form cleared.', false);
  }

  // Form validation getter
  get isFormValid(): boolean {
    return this.onboardingForm.valid;
  }

  // Submit form method - now redirects to progress screen
  submitForm() {
    if (!this.isFormValid) {
      this.snackBar.open('Please fill in all required fields before submitting.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isSubmitting = true;
    
    try {
      const formData = this.getCompleteFormData();
      const formTitle = this.onboardingForm.get('formTitle')?.value || 'Customer Onboarding Form';
      
      // Save submission
      const submissionId = this.formStorageService.submitForm(formData, formTitle);
      
      // Add confirmation message to chat
      this.addMessage(`Your onboarding request has been submitted successfully! Submission ID: ${submissionId}. Redirecting to progress screen...`, false);
      
      // Navigate to progress screen with submission ID
      setTimeout(() => {
        this.router.navigate(['/progress'], { 
          state: { submissionId: submissionId } 
        });
      }, 1000); // Small delay to show the message
      
      // Prevent autosave from running after submission
      this.onboardingForm.markAsPristine();
      this.formStorageService.clearCurrentDraft();
    } catch (error) {
      console.error('Error submitting form:', error);
      this.snackBar.open('Error submitting form. Please try again.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isSubmitting = false;
    }
  }
} 