// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet')
const jwt = require('jsonwebtoken'); 
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
});
app.use(limiter);
app.use(helmet())
app.use(express.json());


async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODBURL);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection error:", err.message);
  }
}



// Product schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  image: { type: String, required: true }
});
const Product = mongoose.model('products', productSchema);

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true }
});
const User = mongoose.model('users', userSchema);


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,        
    pass: process.env.GMAIL_APP_PASSWORD
  }
});


async function sendEmail(toEmail, username) {
  try {
    const mailOptions = {
      from: `"My App" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Registration Successful',
      text: `Hi`,
      
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}


// Status check
app.get('/', (req, res) => {
  res.send("Server is active");
});

app.get('/userdetails',function(req,res){
  let age=req.query.age;
  let location=req.query.location;
  res.json({
    message:`this person age is ${age} and hid/her location is ${location}`
  })
})


app.post('/products', async (req, res) => {
  try {
    const { name, price, image, qty } = req.body;
    await Product.create({ name, price, image, qty });
    res.status(201).json({ message: "Product Added Successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Fetch all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ products });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product
app.delete('/products', async (req, res) => {
  try {
    const { _id } = req.body;
    await Product.findByIdAndDelete(_id);
    res.json({ message: "Product Deleted Successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.put('/products', async (req, res) => {
  try {
    const { _id, name, price, qty, image } = req.body;
    await Product.findByIdAndUpdate(_id, { name, price, qty, image }, { new: true });
    res.json({ message: "Product Updated Successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});




app.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, email });

    // Send confirmation email to the email from Postman
    await sendEmail(email, username);

    res.json({ message: 'Registration Successful. Email sent!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await connectDB();
});
