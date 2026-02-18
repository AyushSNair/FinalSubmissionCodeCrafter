const express = require("express");
const router = express.Router();
const User = require("../models/userModel.js"); // Import User model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// User Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists!" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save new user
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password!" });

    // Compare passwords
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid email or password!" });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1h" });
    
    res.json({ message: "Login successful!", token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update User Credits
router.post("/update-credits", async (req, res) => {
  try {
    const { email, credits } = req.body;

    // Validate input
    if (!email || credits === undefined) {
      return res.status(400).json({ message: "Email and credits are required!" });
    }

    if (credits < 0) {
      return res.status(400).json({ message: "Credits cannot be negative!" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Add credits to existing balance
    user.credits += credits;
    await user.save();
    
    res.json({ message: "Credits updated successfully!", credits: user.credits });
  } catch (err) {
    console.error('Error updating credits:', err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
