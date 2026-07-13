const express = require('express');
const MealLog = require('../models/MealLog');
const Profile = require('../models/Profile');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeals = await MealLog.find({
      user: req.user._id,
      date: { $gte: today, $lt: tomorrow },
    });

    const totals = todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const profile = await Profile.findOne({ user: req.user._id });
    const calorieGoal = profile?.dailyCalorieGoal || 2000;

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      const dayMeals = await MealLog.find({
        user: req.user._id,
        date: { $gte: day, $lte: dayEnd },
      });
      const dayTotals = dayMeals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
          carbs: acc.carbs + (meal.carbs || 0),
          fat: acc.fat + (meal.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      weeklyData.push({
        date: day.toISOString().split('T')[0],
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        ...dayTotals,
      });
    }

    res.json({
      today: {
        meals: todayMeals,
        totals,
        calorieGoal,
        remaining: calorieGoal - totals.calories,
      },
      weekly: weeklyData,
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
