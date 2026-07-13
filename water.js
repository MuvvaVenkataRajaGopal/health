const express = require('express');
const WaterLog = require('../models/WaterLog');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let log = await WaterLog.findOne({ user: req.user._id, date: { $gte: today, $lt: tomorrow } });
    if (!log) {
      log = await WaterLog.create({ user: req.user._id, glasses: 0, ml: 0 });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { glasses = 1 } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let log = await WaterLog.findOne({ user: req.user._id, date: { $gte: today, $lt: tomorrow } });
    if (!log) {
      log = await WaterLog.create({ user: req.user._id, glasses, ml: glasses * 250 });
    } else {
      log.glasses += glasses;
      log.ml += glasses * 250;
      await log.save();
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let log = await WaterLog.findOne({ user: req.user._id, date: { $gte: today, $lt: tomorrow } });
    if (log) {
      log.glasses = 0;
      log.ml = 0;
      await log.save();
    }
    res.json(log || { glasses: 0, ml: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
