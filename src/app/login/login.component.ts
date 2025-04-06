import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
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
          alert("Incorrect credentials. Please try again.");
        } else {
          alert("Login failed. Please check your credentials and try again.");
        }
        console.error('Login failed', err);
      }
    });
  }

  register() {
    if (this.registerPassword !== this.registerConfirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    this.http.post('/api/register', {
      username: this.registerUsername,
      password: this.registerPassword
    }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        console.log('Registration success, auto-login now...', response);
        // Auto-login after registration:
        this.loginUsername = this.registerUsername;
        this.loginPassword = this.registerPassword;
        this.isLoginMode = true;
        this.login();
      },
      error: err => {
        if (err.status === 409) {
          alert("Username already exists. Please log in instead.");
        } else {
          alert("Registration failed. Please try again later.");
        }
        console.error('Registration failed', err);
      }
    });
  }
}
