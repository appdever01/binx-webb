require('dotenv').config()
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const querystring = require("querystring");
const { createProxyMiddleware } = require("http-proxy-middleware");
const dateFns = require('date-fns');
const { differenceInDays } = require('date-fns');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');

const connectDB = require('./db')
const User = require('./model') 

const app = express();

const url = "http://localhost:3001"

// app.use(cors({
//   origin: url,
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   credentials: true, // Enable credentials (e.g., cookies, authorization headers)
// }));

app.use(cors())

app.use(express.static("public"));
app.use(bodyParser.json())
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser());
// get keys
const DB_KEY = process.env.DB_KEY;
const verify_key = process.env.VERIFY_KEY
const publicKey = process.env.PUBLIC_KEY
const live = process.env.LIVE
const verify_key2 = process.env.VERIFY_KEY2

  
const allowedOrigins = ['https://binxai.tekcify.com', "http://localhost:3001"];

const crypto = require('crypto');
const secretKey = process.env.SECRET_KEY;


const confirm_payment = async (phone, reference) => {

  const user_basic = await User.findOne({phone_number: phone.trim(), id: reference})

  let paid = false
  let otp;

  if(user_basic){
    paid = true
    otp = user_basic.otp
  }

  return {
    status: 200,
    failed: false,
    paid: paid,
    otp: otp
  }
}

app.post("/api/webhook", async function(req, res) {
   
    const {db_key} = req.query
    if(!db_key){
      return res.json({
        status: 401,
        success: false
      })
    }
    if(db_key != DB_KEY){
      return res.json({
        status: 401,
        success: false,
        message: "check"
      })
    }

    let id_ = req.body.data.reference

    //validate event
    // const payload = JSON.stringify(req.body);

    // const hash = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');

    // console.log(hash)
    // console.log(req.headers['x-paystack-signature'])
    //     if (hash == req.headers['x-paystack-signature']) {
    // Retrieve the request's body
    const event = req.body;
    let status = 400;
   
    // check if customer has been proccessed
    const check_customer = await User.find({id: id_})

    if(check_customer.length > 0){
      console.log("true proccesed")
      return
    }

    switch (event.event) {
      case 'charge.create':
        // Handle successful payment event
        break;

      case 'charge.success':
        // Make a POST request to save the user to database
        // const apiUrl = `http://localhost:3001/api/user`; // Replace with your API endpoint
        const dataToSend = {
          email: event.data.customer.email,
          amount_dollars: event.data.metadata.custom_fields[1].value, 
          phone: event.data.metadata.custom_fields[0].value, 
          amount: event.data.amount
        };

        
        // save data to database
        let today = new Date();
        const date_30 = add30Days(today, 30)
        const date = convert_date(date_30)
        const date2 = convert_date(today)

        const {email, phone, amount, amount_dollars} = dataToSend
        let phone_ = phone.replace('+', '');

        const user = await User.create({
          id: id_,
          email, phone_number:phone_,
          date_paid: date2,
          amount: amount,
          amount_dollars: amount_dollars
        })
    
        status = 200

        break;

      // Add more cases for other event types as needed

      default:
        console.log('Unhandled event:', event);
    }
    
    res.sendStatus(status);
});

app.get('/pay', (req, res) => {

  res.render('pay', {
    publicKey,
    live,
    verify_key: verify_key2
  })

})



const set_otp = async (phone, reference) => {
  
    const user = await User.findOne({phone_number: phone.trim(), id: reference})


    const id = user._id
    const set_otp = await User.findOneAndUpdate({_id: id}, {otp: true}, {new: true})

}


// Set up a proxy for the HTTP API
app.get("/api/request", async (req, res, next) => {
  // Extract parameters from the original request
  const { phone, key, reference } = req.query;

  if(!key){
    return res.json({
      status: 401,
      success: false
    })
  }
  if(key != verify_key2){
    return res.json({
      status: 401,
      success: false
    })
  }


  if(!phone || !reference){
    return res.json({
      status: 404,
      failed: true,
      message: "phone field and reference filled must not be empty"
    })
  }

  let phone_;

  // Check if the original value contains a space
  if (phone.includes(" ")) {
    // Replace spaces with '+'
    phone_ = phone.replace(/ /g, "+");
  } else {
    phone_ = phone;
  }

  const {paid, otp} = await confirm_payment(phone, reference)

  if(paid == true){
    if(paid == true & otp == false){
      try{
        const response = await axios.get(
          `http://binxai.tekcify.com:4001/request?phone=${phone_}&key=${verify_key}`,
        );
        res.json(response.data);
    
      } catch (error){
        console.log(error);
        console.log("check:", error.response.data);
        res.json(error.response.data);
      }
    } else {
      return res.json({
        status: 401,
        failed: true,
        message: "Error1"
      })
    }   
  } else {
    return res.json({
      status: 401,
      failed: true,
      message: "Error2"
    })
  }
 
  
});

app.get("/api/verify", async (req, res, next) => {
  // Extract parameters from the original request
  const { phone, code, key, reference } = req.query;
  
  if(!key){
    return res.json({
      status: 401,
      success: false,
      message: "UnAuthorized",
    })
  }
  if(key != verify_key2){
    return res.json({
      status: 401,
      success: false,
      message: "UnAuthorized",
    })
  }
  if(!reference && !phone){
    return res.json({
      status: 404,
      success: false,
      message: "Payment Failed"
    })
  }


  // check plan and number correlates

  const user = await User.findOne({phone_number: phone.trim(), id: reference})


  if(!user){
    return res.json({
      status: 401,
      success: false,
      message: "Payment Failed"
    })
  }
  
  const credit = await user.amount_dollars
  try {
    const response = await axios.get(
      `http://binxai.tekcify.com:4001/verify?phone=${phone}&key=${verify_key}&code=${code}&credit=${credit}`,
    );
    // set otp in the dataase
    if (response.data.successful.startsWith("Congratulations")){
      await set_otp(phone,reference )
    }
    res.json(response.data);
  } catch (error) {
    console.log(error);
    console.log("check:", error.response.data);
    res.json(error.response.data);
  }

});

// middlewares
const convert_date = (today) => {
  // let today = new Date();
  let dd = String(today.getDate()).padStart(2, '0');
  let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  let yyyy = today.getFullYear();

  today = yyyy + '-' + mm + '-' + dd;

  return today
}

function add30Days(givenDate, no_of_days) {
  let addedDate = dateFns.addDays(givenDate, no_of_days);
  return addedDate;
 }



// function to check if the given date is within 30 days before the specific date
function isWithin30DaysBefore(givenDate, specificDate) {
 // check if the given date is before the specific date
 if (dateFns.isBefore(givenDate, specificDate)) {
    // calculate the difference in days between the given date and the specific date
    let diffInDays = dateFns.differenceInDays(specificDate, givenDate);

    // check if the difference is within 30 days
    if (diffInDays <= 30) {
      return true;
    }
 }

 return false;
}

function howManyDaysPast(currentDate, pastDate){

    let numberOfDays = differenceInDays(currentDate, pastDate);

    return numberOfDays
}


function stringToFloat(inputString) {
  try {
      const floatValue = parseFloat(inputString);
      if (isNaN(floatValue)) {
          throw new Error("Invalid input. Please enter a string that can be converted to a float.");
      }
      return floatValue;
  } catch (error) {
      console.error(error.message);
      return null;
  }
}

app.get('/api/get_amount', async (req, res) => {

  // api url only for premium subscriotion payments
    const {phone, amount } = req.query

    // convert to float
    const amount_ = stringToFloat(amount);

    if(amount_ == null){
      return res.json({
        status: 404,
        amount: -20,
        failed: true,
        message: "Amount Invalid"
      })
    }
    
    if(!phone){
      return res.json({
        status: 404,
        amount: -20,
        failed: true,
        message: "Phone field must not be empty"
      })
    }

    const phone_ = phone.trim()
    //make sure amount is not less than $1
    if(amount_ < 1){
      return res.json({
        status: 404,
        amount: -20,
        failed: true,
        message: "Amount must not be less than $1"
      })
    }

    // convert to naira
    let new_amount = amount_ * 1175

    res.json({
      status: 200,
      amount: new_amount * 100, //in kobo
      amount_dollars: amount_,
      failed: false,
    })
    
})



app.get('/api/confirm', async (req, res) => {

    const {phone, reference} = req.query
 

      const phone_ = phone.trim()

      if(!phone || !reference){
        return res.json({
          status: 404,
          failed: true,
          message: "Phone field must not be empty"
        })
      }

      const user_basic = await User.findOne({phone_number: phone.trim(), id: reference})

      let paid = false
      let otp;
    
      if(user_basic){
        paid = true
        otp = user_basic.otp
      }

      res.json({
        status: 200,
        failed: false,
        paid: paid,
        otp: otp
      })
    
})


app.post('/api/set_otp', async ( req, res) => {
  const {phone, reference} = req.body

  
  const origin = req.get('Origin');

  
  if (allowedOrigins.includes(origin)) {
      
    let phone_ = phone.replace('+', '');

    const user = await User.findOne({phone_number: phone.trim(), id: reference})

    if(!user){
      return res.json({
        status: 401,
        success: false
      })
    }
    const id = user._id
    const set_otp = await User.findOneAndUpdate({_id: id}, {otp: true}, {new: true})

    res.json({
      status: 200,
      message: "Otp Successfully Sent"
    })
  } else {
    return res.json({
      status: 401,
      success: false
    })
  }

})

const port = 3001;
app.listen(port, async () => {
  //connect DB
  await connectDB()
  console.log(`Server is running on port ${port}\n\nhttp://localhost:${port}`);
});



