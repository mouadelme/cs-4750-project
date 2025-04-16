// nutritionix-search.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';


@Component({
  selector: 'app-nutritionix-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nutritionix-search.component.html',
  styleUrls: ['./nutritionix-search.component.css']
})


export class NutritionixSearchComponent {
  foodName = '';
  result: any = null;
  loading = false;
  error: string | null = null;

  mealTypes: string[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
  selectedMeal = '';
  servings: number = 1;


  private appId = 'ddf68a64';
  private appKey = '3426137af00a32d5719868a2f7f8966b';

  logFood(){

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
