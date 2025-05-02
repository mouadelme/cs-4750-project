import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLoginMode = true;

  loginUsername = '';
  loginPassword = '';

  registerUsername = '';
  registerPassword = '';
  registerConfirmPassword = '';

  private _errorMessage: string | null = null;
  get errorMessage(): string | null {
    return this._errorMessage;
  }
  set errorMessage(value: string | null) {
    this._errorMessage = value;
    if (value) {
      setTimeout(() => {
        this._errorMessage = null;
      }, 3000);
    }
  }


  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  onSubmit() {
    if (this.isLoginMode) {
      this.login();
    } else {
      this.register();
    }
  }

  login() {
    this.http.post('/api/login', {
      username: this.loginUsername,
      password: this.loginPassword
    }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        console.log('Login successful', response);
        this.authService.setUser(response.user);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        if (err.status === 401) {
          this.errorMessage = 'Incorrect credentials. Please try again.';
        } else {
          this.errorMessage = 'Login failed. Please check your credentials and try again.';
        }
        console.error('Login failed', err);
      }
    });
  }

  register() {
    if (this.registerPassword !== this.registerConfirmPassword) {
      this.errorMessage ='Passwords do not match!';
      return;
    }
    
    const validationError = this.validatePassword(this.registerPassword);
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.http.post('/api/register', {
      username: this.registerUsername,
      password: this.registerPassword
    }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        console.log('Registration success, auto-login now...', response);
        this.loginUsername = this.registerUsername;
        this.loginPassword = this.registerPassword;
        this.isLoginMode = true;
        this.login();
      },
      error: err => {
        if (err.status === 409) {
          this.errorMessage = 'Username already exists. Please log in instead.';
        } else {
          this.errorMessage = 'Registration failed. Please try again later.';
        }
        console.error('Registration failed', err);
      }
    });
  }

  validatePassword(password: string): string | null {
    const regex = /^(?=.*[A-Za-z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (regex.test(password)) {
      return null;
    }
    return 'Password must be at least 8 characters and include at least 1 letter and 1 special character.';
  }
}
