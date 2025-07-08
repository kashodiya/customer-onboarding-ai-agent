import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService, ChatMessage, FormField } from '../../services/chat.service';
import { Subscription } from 'rxjs';

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
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent implements OnInit, OnDestroy {
  chatMessages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  messageCounter = 0;
  chatExpanded = true;
  smartGuideEnabled = true; // Smart Guide is enabled by default
  showWelcomeButtons = false; // Show buttons after welcome message
  
  onboardingForm: FormGroup;
  formUpdatesSubscription?: Subscription;

  // Data arrays for dropdowns
  internalExternalOptions = ['Internal', 'External'];
  environmentOptions = ['DEV', 'QA', 'PROD'];
  regionOptions = ['NORTH', 'SOUTH'];
  backupRegionOptions = ['NORTH', 'SOUTH', 'None'];
  networkLocationOptions = ['On Site', 'Cloud'];

  constructor(
    private chatService: ChatService,
    private formBuilder: FormBuilder
  ) {
    this.onboardingForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      // Section 1: Existing Flows
      existingFlows: this.formBuilder.group({
        sourceApplicationName: ['', Validators.required],
        targetApplicationName: ['', Validators.required],
        isUsingIODS: [false, Validators.required],
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
        backupRegion: ['', Validators.required]
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
        requiresExternalVendorConnection: [false, Validators.required]
      }),

      // Section 4: File Transfer Information (Cloud)
      fileTransferInfo: this.formBuilder.group({
        hasOutbound: [false, Validators.required],
        sourceAwsAccount: [''],
        sourceBucketArn: [''],
        sourceArchiveBucket: [''],
        sourceArchivePrefix: [''],
        hasInbound: [false, Validators.required],
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
    this.initializeEnvironmentsArray();
    this.startAgent();
    this.subscribeToFormUpdates();
  }

  ngOnDestroy() {
    if (this.formUpdatesSubscription) {
      this.formUpdatesSubscription.unsubscribe();
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

  get hasOutbound() {
    return this.onboardingForm.get('fileTransferInfo.hasOutbound')?.value;
  }

  get hasInbound() {
    return this.onboardingForm.get('fileTransferInfo.hasInbound')?.value;
  }

  startAgent() {
    // Include current form state in case user has already filled some fields manually
    const currentFormData = this.getCompleteFormData();
    
    this.chatService.startAgent(currentFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
        // Show welcome buttons after the welcome message
        this.showWelcomeButtons = true;
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
        console.log('Received form update:', updates);
        try {
          // updates is already parsed, no need for JSON.parse()
          if (updates && updates.name && updates.value !== undefined) {
            console.log(`Updating field: ${updates.name} = ${updates.value}`);
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
        console.log(`✅ Updated environments: ${value.join(', ')}`);
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
            console.log(`✅ Updated date: ${value} → ${parsedDate.toLocaleDateString()}`);
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
    if (!this.newMessage.trim()) return;

    this.addMessage(this.newMessage, true);
    this.isLoading = true;

    // Check if user is responding to mode preference question
    const message = this.newMessage.toLowerCase().trim();
    const isManualResponse = message.includes('manual') || message.includes('on-demand') || message.includes('on demand') || 
                             message.includes('only respond') || message.includes('passive') ||
                             (message.includes('no') && (message.includes('guide') || message.includes('help') || message.includes('assistance'))) ||
                             message === 'no' || message === 'nope' || message === 'no thanks' || message === 'no thank you';
    const isSmartGuideResponse = message.includes('smart guide') || message.includes('proactive') || 
                                 message.includes('guide me') || message.includes('help me') ||
                                 (message.includes('yes') && (message.includes('guide') || message.includes('help') || message.includes('assistance'))) ||
                                 message === 'yes' || message === 'yeah' || message === 'yep' || message === 'sure' || message === 'ok' || message === 'okay';

    // Get current form state
    const currentFormData = this.getCompleteFormData();

    this.chatService.askAgent(this.newMessage, currentFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
        this.isLoading = false;
        
        // Auto-toggle Smart Guide based on user's mode preference
        if (isManualResponse && this.smartGuideEnabled) {
          console.log('Detected manual preference, disabling Smart Guide');
          this.smartGuideEnabled = false;
          // Notify backend about the mode change
          this.chatService.toggleSmartGuide(false, currentFormData).subscribe({
            next: (toggleResponse) => {
              this.addMessage(toggleResponse.answer, false);
            },
            error: (error) => {
              console.error('Error notifying backend about manual mode:', error);
            }
          });
        } else if (isSmartGuideResponse && !this.smartGuideEnabled) {
          console.log('Detected smart guide preference, enabling Smart Guide');
          this.smartGuideEnabled = true;
          // Notify backend about the mode change
          this.chatService.toggleSmartGuide(true, currentFormData).subscribe({
            next: (toggleResponse) => {
              this.addMessage(toggleResponse.answer, false);
            },
            error: (error) => {
              console.error('Error notifying backend about smart guide mode:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.addMessage('Error sending message. Please check if the backend is running.', false);
        this.isLoading = false;
      }
    });

    this.newMessage = '';
  }

  onFieldChange(fieldPath: string, value: any) {
    if (value === null || value === undefined) return;
    
    // Only send updates to AI agent if Smart Guide is enabled
    if (!this.smartGuideEnabled) return;
    
    const fieldData: FormField = { name: fieldPath, value: value };
    const completeFormData = this.getCompleteFormData();
    
    this.chatService.updateFormField(fieldData, completeFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
      },
      error: (error) => {
        console.error('Error updating field:', error);
      }
    });
  }

  onEnvironmentChange() {
    const selectedEnvironments = this.environmentsFormArray.value
      .map((checked: boolean, idx: number) => checked ? this.environmentOptions[idx] : null)
      .filter((env: string | null) => env !== null);
    
    this.onFieldChange('applicationInfo.environments', selectedEnvironments);
  }

  onSmartGuideToggle(enabled: boolean) {
    this.smartGuideEnabled = enabled;
    
    // Get current form state to send to the agent
    const currentFormData = this.getCompleteFormData();
    
    this.chatService.toggleSmartGuide(enabled, currentFormData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
      },
      error: (error) => {
        console.error('Error toggling Smart Guide:', error);
        // Add fallback local messages if the API call fails
        if (enabled) {
          this.addMessage('Smart Guide enabled! What\'s your source application name?', false);
        } else {
          this.addMessage('Manual mode active. Ask me anything!', false);
        }
      }
    });
  }

  private getCompleteFormData(): any {
    const formValue = this.onboardingForm.value;
    
    // Clean up the form data and handle special cases
    const cleanedData = {
      ...formValue,
      // Convert environment array to selected environment names
      applicationInfo: {
        ...formValue.applicationInfo,
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
  }

  onEnterKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleChat() {
    this.chatExpanded = !this.chatExpanded;
  }

  onWelcomeButtonClick(wantsAssistance: boolean) {
    this.showWelcomeButtons = false;
    this.smartGuideEnabled = wantsAssistance;
    this.onSmartGuideToggle(wantsAssistance);
  }
} 