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
    age: null,
    gender: '',
    weight: null,
    height_ft: null,
    height_in: null,
    username: ''
  };

  error: string | null = null;

  constructor(private router: Router, private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.username) {
      this.profile.username = user.username;
    } else {
      this.error = 'User not found. Please log in again.';
    }
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
        alert('Profile saved successfully!');
      },
      error: (err: any) => {
        console.error('Error saving profile:', err);
        this.error = 'Failed to save profile. Try again later.';
      }
    });
  }
}
