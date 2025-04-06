import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor(private http: HttpClient, private router: Router) {}

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
    }).subscribe({
      next: () => {
        console.log('Login successful');
        this.router.navigate(['/dashboard']);
      },
      error: err => console.error('Login failed', err)
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
    }).subscribe({
      next: () => {
        console.log('Registration success, auto-login now...');
        // Auto-login after registration
        this.loginUsername = this.registerUsername;
        this.loginPassword = this.registerPassword;
        this.isLoginMode = true;
        this.login();
      },
      error: err => console.error('Registration failed', err)
    });
  }
}
