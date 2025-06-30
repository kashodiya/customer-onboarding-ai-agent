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
    this.ws = new WebSocket('ws://localhost:8000/ws');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update-form') {
        this.formUpdatesSubject.next(data.payload);
      }
    };

    this.ws.onclose = () => {
      // Reconnect after a delay
      setTimeout(() => this.initializeWebSocket(), 5000);
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