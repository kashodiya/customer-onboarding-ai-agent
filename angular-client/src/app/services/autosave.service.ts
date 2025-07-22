import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AutosaveService {
  private autosavingSubject = new BehaviorSubject<boolean>(false);
  public autosaving$: Observable<boolean> = this.autosavingSubject.asObservable();

  setAutosaving(isAutosaving: boolean) {
    this.autosavingSubject.next(isAutosaving);
  }
} 