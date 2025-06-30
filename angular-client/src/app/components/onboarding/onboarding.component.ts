import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    MatDividerModule
  ],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent implements OnInit, OnDestroy {
  chatMessages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  messageCounter = 0;
  
  onboardingForm: FormGroup;
  formUpdatesSubscription?: Subscription;

  environments = ['Development', 'Testing', 'Staging', 'Production'];
  transferMethods = ['SFTP', 'API', 'Database', 'File Share', 'Message Queue', 'Other'];
  frequencyTypes = ['Daily', 'Weekly', 'Monthly', 'Custom'];
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private chatService: ChatService,
    private formBuilder: FormBuilder
  ) {
    this.onboardingForm = this.formBuilder.group({
      flowName: ['', Validators.required],
      sourceSystemName: ['', Validators.required],
      sourceEnvironment: ['', Validators.required],
      sourceSystemOwner: ['', Validators.required],
      targetSystemName: ['', Validators.required],
      targetEnvironment: ['', Validators.required],
      targetSystemOwner: ['', Validators.required],
      transferMethod: ['', Validators.required],
      otherTransferMethod: [''],
      frequencyType: ['', Validators.required],
      customSchedule: [''],
      specificTime: [''],
      dayOfWeek: [''],
      dayOfMonth: ['']
    });
  }

  ngOnInit() {
    this.startAgent();
    this.subscribeToFormUpdates();
  }

  ngOnDestroy() {
    if (this.formUpdatesSubscription) {
      this.formUpdatesSubscription.unsubscribe();
    }
  }

  startAgent() {
    this.chatService.startAgent().subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
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
          const parsedUpdates = JSON.parse(updates);
          if (parsedUpdates.name && parsedUpdates.value !== undefined) {
            this.onboardingForm.patchValue({
              [parsedUpdates.name]: parsedUpdates.value
            });
          }
        } catch (error) {
          console.error('Error parsing form updates:', error);
        }
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    this.addMessage(this.newMessage, true);
    this.isLoading = true;

    this.chatService.askAgent(this.newMessage).subscribe({
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

  onFieldChange(fieldName: string, value: any) {
    if (!value) return;
    
    const fieldData: FormField = { name: fieldName, value: value };
    
    this.chatService.updateFormField(fieldData).subscribe({
      next: (response) => {
        this.addMessage(response.answer, false);
      },
      error: (error) => {
        console.error('Error updating field:', error);
      }
    });
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
} 