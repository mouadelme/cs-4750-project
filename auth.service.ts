// auth.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser: any = null;
  static authService: any;

  setUser(user: any): void {
    this.currentUser = user;
  }

  getUser(): any {
    return this.currentUser;
  }
}
