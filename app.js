const express=require('express');
const cors=require('cors')
const bcrypt=require('bcrypt');
const rateLimit=require('express-rate-limit');
const dotenv=require('dotenv');
const nodemailer=require('nodemailer');
const helmet=require('helmet');
const jwt=require('jsonwebtoken')
dotenv.config();




//step 1- import the package

const mongoose=require('mongoose');        
const app=express();
const port=process.env.PORT
//middlewares
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)
app.use(helmet())
app.use(cors());  //------->middle ware which enables cors
app.use(express.json())

//step 2-establish a connection       ------->connection string
async function connection(){
 await mongoose.connect(process.env.MONGODBURL)
 

}

//step 3-create a schema
let porductschema=new mongoose.Schema({
    name:{type:String,required:true},
    price:{type:Number,required:true},
    qty:{type:Number,required:true},
    image:{type:String,required:true}
})

//step 4-create a model
let productmodel=mongoose.model('products',porductschema)

// let products=[{
// user schema
let userschema=new mongoose.Schema({
  username:{type:String,required:true,unique:true},
  password:{type:String,required:true},
  email:{type:String,required:true}

})    
 let usermodel=mongoose.model('user',userschema);



app.get('/',function(req,res){
    res.send('server is active')
})

app.get('/userdetails',function(req,res){
  let age=req.query.age;
  let location=req.query.location;
  res.json({
    message:`This person age is ${age} and his/her location is ${location}`
  })
})

//api -2 --->fetch all products

app.post('/products',async function(req,res){
    try {
      const {name,price,image,qty}=req.body
      let products=await  productmodel.create({name,price,image,qty})
      res.status(201).json({
        message:"product added successfully"
      })
        
    } catch (error) {
      res.json({
        message:error.message
      })
        
    }
})
app.get('/products',async function (req,res) {
  try {
    let products= await productmodel.find();
    res.status(200).json({
      products
    })
  }catch (error){
    res.json({
      message:error.message
    })

  } 
})

//api-3  ----->sore products in a database


// api -----> delete
app.delete('/products',async function(req,res){
  try{
    const {_id}=req.body;
    let products= await productmodel.findByIdAndDelete(_id);
    res.json({
      message:"product is deleted successfully"
    })
  } catch (error){
    res.json({
      message:error.message
    })
     
  }
})

app.put('/products',async function(req,res){
  try{
    const{_id,name}=req.body;
    let products=await productmodel.findByIdAndUpdate(_id,name)
    res.json({
      
      message:"product is updated"
    })
  } catch (error){
    res.json({
      message:error.message
    })
  }
})
 //api6----> store registration details

 


app.post('/register', async function(req,res){
  try{
    const {username,password,email}=req.body;
    let user= await usermodel.findOne({username})
    if(user) return res.json({message:"user Already exsits"})
    let hashpassword= await bcrypt.hash(password,10);
  let finaluser= await usermodel.create({username,password:hashpassword,email})

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});
const mailOption={
    from: process.env.GMAIL_USER,
    to: 'chrohankumar8504@gmail.com',
    subject: 'tes email from gmail',
    text: 'hello this is a test email snet through gmail using nodemailer',
    html: `
    <h2>hi,you have successfully registered ${username}<!h2>
    `
};
console.log('sending email')
// send the mail
transporter.sendMail(mailOption);
  res.json({
    message:'registration successfull'
  })
    
  }catch (error){
    res.json({
      message:error.message
    })

  }
})

app.post('/login',async function(req,res){
try{
const{username,password}=req.body;
let user=await usermodel.findOne({username})
if(!user)return res.json({message:"usre not found"})
  let authuser=bcrypt.compare(password,user.password);
if(!authuser) return res.json({message:"invalid credentials"})
  //token generation
let Secret=Osman123
let token=await jwt.sign({user:username}.Secret,{expireIn:'1hr'})
if(!token) return res.json({
  message:"token is required"
})

  res.json({message:"login successful"},token)

}catch(error){
res.json({
  message:error.message
})
}

})




app.listen(port,async function(){
    console.log(`the server is running on ${port}`)
    await connection();
    console.log('DB IS CONNECTED')
  
})