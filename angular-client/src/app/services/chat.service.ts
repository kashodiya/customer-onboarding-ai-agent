import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface FormField {
  name: string;
  value: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8000/api';
  private ws?: WebSocket;
  private formUpdatesSubject = new Subject<any>();
  
  constructor(private http: HttpClient) {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const isDev = window.location.port === '7151';
    const wsUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPath = isDev ? `${wsUrl}//${window.location.host}/ws` : `${wsUrl}//ec2-54-209-155-169.compute-1.amazonaws.com:7104/proxy/8000/ws`;
    
    this.ws = new WebSocket(wsPath);
    
    
    this.ws.onmessage = (event) => {
      try {
      const data = JSON.parse(event.data);
      if (data.type === 'update-form') {
        this.formUpdatesSubject.next(data.payload);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.initializeWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  askAgent(prompt: string, formData?: any): Observable<any> {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = formData ? 
      `${this.apiUrl}/ask-agent/${encodedPrompt}?formData=${encodeURIComponent(JSON.stringify(formData))}` :
      `${this.apiUrl}/ask-agent/${encodedPrompt}`;
    return this.http.get(url);
  }

  startAgent(formData?: any): Observable<any> {
    const url = formData ? 
      `${this.apiUrl}/start-agent?formData=${encodeURIComponent(JSON.stringify(formData))}` :
      `${this.apiUrl}/start-agent`;
    return this.http.get(url);
  }

  updateFormField(fieldData: FormField, completeFormData?: any): Observable<any> {
    const payload = { ...fieldData, completeFormData: completeFormData || {} };
    return this.http.post(`${this.apiUrl}/update-form-field`, payload);
  }

  toggleSmartGuide(enabled: boolean, formData?: any): Observable<any> {
    const payload = { enabled, formData: formData || {} };
    return this.http.post(`${this.apiUrl}/toggle-smart-guide`, payload);
  }

  getFieldContext(fieldData: FormField, completeFormData?: any): Observable<any> {
    const payload = { ...fieldData, completeFormData: completeFormData || {} };
    return this.http.post(`${this.apiUrl}/get-field-context`, payload);
  }

  getFormUpdates(): Observable<any> {
    return this.formUpdatesSubject.asObservable();
  }

  submitForm(formData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/submit-form`, formData);
  }
} 