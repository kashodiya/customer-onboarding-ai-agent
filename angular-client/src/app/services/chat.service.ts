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
  private apiUrl = '/api';
  private ws?: WebSocket;
  private formUpdatesSubject = new Subject<any>();
  
  constructor(private http: HttpClient) {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const wsUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host.includes('4200') ? 'localhost:8000' : window.location.host;
    this.ws = new WebSocket(`${wsUrl}//${wsHost}/ws`);
    
    this.ws.onopen = () => {
      console.log('🔌 WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      console.log('📨 WebSocket message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('📋 Parsed message:', data);
        if (data.type === 'update-form') {
          console.log('🎯 Form update message:', data.payload);
          this.formUpdatesSubject.next(data.payload);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected, attempting to reconnect...');
      setTimeout(() => this.initializeWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }

  askAgent(prompt: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ask-agent/${encodeURIComponent(prompt)}`);
  }

  startAgent(): Observable<any> {
    return this.http.get(`${this.apiUrl}/start-agent`);
  }

  updateFormField(fieldData: FormField): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-form-field`, fieldData);
  }

  getFormUpdates(): Observable<any> {
    return this.formUpdatesSubject.asObservable();
  }
} 