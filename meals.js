const express = require('express');
const MealLog = require('../models/MealLog');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const query = { user: req.user._id };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const meals = await MealLog.find(query).populate('food').sort({ date: -1 });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { foodId, foodName, mealType, date, quantity, servingSize, calories, protein, carbs, fat } = req.body;
    const meal = await MealLog.create({
      user: req.user._id,
      food: foodId,
      foodName,
      mealType,
      date: date || new Date(),
      quantity,
      servingSize,
      calories,
      protein,
      carbs,
      fat,
    });
    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const meal = await MealLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meal) return res.status(404).json({ message: 'Meal not found' });
    res.json({ message: 'Meal removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
