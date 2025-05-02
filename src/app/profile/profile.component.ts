import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profile = {
    fname: '',
    lname: '',
    age: null as number | null,
    gender: '',
    weight: null as number | null,
    height_ft: null as number | null,
    height_in: null as number | null,
    username: ''
  };
  
  hasExistingProfile = false;
  showEditForm = false;
  loading = true;
  error: string | null = null;
  private _errorMessage: string | null = null;
  updatedPassword = { currentPassword: '', newPassword: '', username: ''};
  successMessage = '';


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

  constructor(private router: Router, private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.username) {
      this.profile.username = user.username;
      this.updatedPassword.username = user.username;
      this.fetchUserProfile();
    } else {
      this.error = 'User not found. Please log in again.';
      this.loading = false;
      this.showEditForm = true; // Show form if not logged in
    }
  }

  fetchUserProfile() {
    this.http.get('/api/profile', { withCredentials: true }).subscribe({
      next: (data: any) => {
        if (data && this.isProfileComplete(data)) {
          this.profile = {
            ...data,
            username: this.profile.username
          };
          this.hasExistingProfile = true;
          this.showEditForm = false; // Hide form initially when profile exists
        } else {
          this.hasExistingProfile = false;
          this.showEditForm = true; // Show form when no profile
        }
        this.loading = false;
      },
      error: (err) => {
        // Any error means we should show the form
        this.hasExistingProfile = false;
        this.showEditForm = true;
        
        if (err.status !== 404) { // 404 is expected if no profile
          console.error('Error fetching profile:', err);
          this.error = 'Failed to load profile data. Try again later.';
        }
        this.loading = false;
      }
    });
  }

  isProfileComplete(profile: any): boolean {
    return !!(
      profile.fname && 
      profile.lname && 
      profile.age && 
      profile.gender && 
      profile.weight && 
      profile.height_ft !== null && 
      profile.height_in !== null
    );
  }

  toggleEditForm() {
    this.showEditForm = !this.showEditForm;
    this.error = null; 
  }

  submitInfo() {
    const { fname, lname, age, gender, weight, height_ft, height_in, username } = this.profile;

    if (!fname || !lname || !age || !gender || !weight || !height_ft || height_in == null || !username) {
      this.error = 'Please fill out all fields.';
      return;
    }

    if (age < 1 || weight < 1 || height_ft < 1 || height_in < 0 || height_in > 11) {
      this.error = 'Please enter realistic values.';
      return;
    }

    this.http.post('/api/profile', this.profile, { withCredentials: true }).subscribe({
      next: () => {
        this.hasExistingProfile = true;
        this.showEditForm = false; 
      },
      error: (err: any) => {
        console.error('Error saving profile:', err);
        this.error = 'Failed to save profile. Try again later.';
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

  changePassword() {
    const { currentPassword, newPassword, username } = this.updatedPassword;
  
    // Empty field check
    if (!currentPassword || !newPassword) {
      this.errorMessage = 'Please fill out all password fields.';
      return;
    }
  
    // Password validation
    const validationError = this.validatePassword(newPassword);
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }
  
    if (currentPassword === newPassword) {
      this.errorMessage = 'New password cannot be the same as the current password.';
      return;
    }
  
    this.http.post('/api/new_password', this.updatedPassword, { withCredentials: true }).subscribe({
      next: () => {
        this.errorMessage = null;
        this.updatedPassword.currentPassword = '';
        this.updatedPassword.newPassword = '';
        this.successMessage = 'Password updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: err => {
        console.error('Password update failed', err);
        this.errorMessage = err?.error?.message || 'Password update failed';
      }
    });
  }
  

}