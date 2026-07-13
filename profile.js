const express = require('express');
const Profile = require('../models/Profile');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { age, gender, height, weight, targetWeight, goal, dietaryPreference, activityLevel, dailyCalorieGoal, dailyWaterGoal } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { age, gender, height, weight, targetWeight, goal, dietaryPreference, activityLevel, dailyCalorieGoal, dailyWaterGoal },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
