// nutritionix-search.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { OnInit } from '@angular/core';
import axios from 'axios';



@Component({
  selector: 'app-nutritionix-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nutritionix-search.component.html',
  styleUrls: ['./nutritionix-search.component.css']
})


export class NutritionixSearchComponent implements OnInit {
  constructor(private authService: AuthService) {}
  foodName = '';
  result: any = null;
  loading = false;
  error: string | null = null;

  mealTypes: string[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
  selectedMeal = '';
  servings: number = 1;


  private appId = 'ddf68a64';
  private appKey = '3426137af00a32d5719868a2f7f8966b';

  username: string = '';

  ngOnInit() {
    axios.get('/api/current-user', { withCredentials: true })
      .then(res => {
        this.username = res.data.username;
      })
      .catch(err => {
        console.error('Failed to fetch user:', err);
      });
}


  logFood() {
    if (!this.result || !this.selectedMeal || !this.servings) {
      alert("Please select a meal and enter the number of servings.");
      return;
    }
    
    const user = this.authService.getUser();
    this.username = user?.username;
    const foodData = {
      username: this.username, // TODO: replace with real user or pull from session
      meal_type: this.selectedMeal.toLowerCase(),
      quantity: this.servings,
      protein: this.result.nf_protein * this.servings,
      fat: this.result.nf_total_fat * this.servings,
      carbs: this.result.nf_total_carbohydrate * this.servings,
    };
  
    axios.post('/api/log-food', foodData, { withCredentials: true })
      .then(response => {
        alert('Food logged successfully!');
      })
      .catch(error => {
        console.error('Error logging food:', error);
        alert('Failed to log food.');
      });
  }
  

  async searchFood() {
    this.loading = true;
    this.error = null;
    this.result = null;

    const url = `https://trackapi.nutritionix.com/v2/natural/nutrients`;
    const headers = {
      'x-app-id': this.appId,
      'x-app-key': this.appKey,
      'Content-Type': 'application/json'
    };
    const body = {
      query: this.foodName,
      timezone: 'US/Eastern'
    };

    try {
      const response = await axios.post(url, body, { headers });
      const foods = response.data.foods;
      if (foods && foods.length > 0) {
        this.result = foods[0];
      } else {
        this.error = 'No results found.';
      }
    } catch (err: any) {
      this.error = err.response?.data?.message || err.message;
    } finally {
      this.loading = false;
    }
  }
}
