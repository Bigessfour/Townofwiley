import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DocumentRefreshService {
  private readonly refreshTrigger = signal(0);

  // Call this when documents are uploaded/deleted to trigger refresh
  triggerRefresh() {
    this.refreshTrigger.set(this.refreshTrigger() + 1);
  }

  // Components can subscribe to this signal to know when to refresh
  getRefreshTrigger() {
    return this.refreshTrigger;
  }
}