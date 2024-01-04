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


const confirm_payment = async (phone, plan) => {

  const user_basic = await User.find({phone_number: phone.trim(), subscription: "Basic"}).sort("-createdAt")
  const user_premium = await User.find({phone_number: phone.trim(), subscription: "Premium"}).sort("-createdAt")


  let user_subscription_basic = {}
  for(const i of user_basic){
      //check and get the user subscription that is not expired
      let date_ = new Date(); // today's date
      const date = convert_date(date_)
      let givenDate = new Date(date);
      let specificDate = new Date(i.expiry_dae);
      const isWithin = isWithin30DaysBefore(givenDate, specificDate)
      if(isWithin == true){
        user_subscription_basic = i
        break
      }
  }

  let user_subscription_premium = {}

  for(const i of user_premium){
    //check and get the user subscription that is not expired
    let date_ = new Date(); // today's date
    const date = convert_date(date_)
    let givenDate = new Date(date);
    let specificDate = new Date(i.expiry_dae);
    const isWithin = isWithin30DaysBefore(givenDate, specificDate)
    if(isWithin == true){
      user_subscription_premium = i
      break
    }
  }

  let paid = false
  let otp;

  if(plan == "Basic"){
    if(Object.keys(user_subscription_basic).length > 0 || Object.keys(user_subscription_premium).length > 0){
      paid = true
    }
    if(Object.keys(user_subscription_basic).length > 0){
      otp = user_subscription_basic.otp
    } else {
      otp = true
    }
    if(Object.keys(user_subscription_premium).length > 0){
      otp = true
    }
  }

  if(plan == "Premium"){
    if(Object.keys(user_subscription_premium).length > 0){
      paid = true
    }
    if(Object.keys(user_subscription_premium).length > 0){
      otp = user_subscription_premium.otp
    } else {
      otp = true
    }
  }
  


  return {
    status: 200,
    failed: false,
    paid: paid,
    otp: otp
  }
}

app.post("/api/webhook", async function(req, res) {
    console.log("worked")
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
    console.log(event)
    let status = 400;
   
    // check if customer has been proccessed
    const check_customer = await User.find({id: id_})

    if(check_customer.length > 0){
      console.log("true proccesed")
      return
    }

    switch (event.event) {
      case 'charge.create':
        console.log('Customer created:', event.data);
        // Handle successful payment event
        break;

      case 'charge.success':
        console.log('Payment successful:', event.data);
        // Make a POST request to save the user to database
        // const apiUrl = `http://localhost:3001/api/user`; // Replace with your API endpoint
        const dataToSend = {
          email: event.data.customer.email,
          subscription: event.data.metadata.custom_fields[1].value, 
          phone: event.data.customer.phone, 
          db_key: DB_KEY,
          amount: event.data.amount
        };

        // axios.post(apiUrl, dataToSend, {
        //   headers: {
        //     'Content-Type': 'application/json',
        //     // Add other headers as needed
        //   },
        // })
        //   .then(response => {
        //     console.log('Response:', response.data);
        //     // Process the response data
        //     if(response.data.status == 201){
        //       status = 200
        //     }
        //   })
        //   .catch(error => {
        //     console.error('Error:', error.message);
        //     // Handle errors
        //   });

          //get expiry dagte
        
        // save data to database
        let today = new Date();
        const date_30 = add30Days(today, 30)
        const date = convert_date(date_30)
        const date2 = convert_date(today)

        const {email, subscription, phone, amount } = dataToSend
        let phone_ = phone.replace('+', '');
        console.log(phone_)

        // check if phone number with subscription plan exist
        const {paid, otp} = await confirm_payment(phone_, subscription)

        if(paid == false){
          const user = await User.create({
            id: id_,
            email, subscription, phone_number:phone_,
            expiry_dae: date,
            date_paid: date2,
            amount: amount
          })
        }

        status = 200

        break;

      // Add more cases for other event types as needed

      default:
        console.log('Unhandled event:', event);
    }
    console.log(status, "check status")

    
    res.sendStatus(status);
});

app.get('/pay', (req, res) => {

  res.render('pay', {
    publicKey,
    live,
    verify_key: verify_key2
  })

})



const set_otp = async (phone, plan) => {
  
    const user = await User.find({phone_number: phone.trim(), subscription: plan}).sort("-createdAt")

    let user_subscription = {}
    for(const i of user){
        //check and get the user subscription that is not expired
        let date_ = new Date(); // today's date
        const date = convert_date(date_)
        let givenDate = new Date(date);
        let specificDate = new Date(i.expiry_dae);
        const isWithin = isWithin30DaysBefore(givenDate, specificDate)
        if(isWithin == true){
          user_subscription = i
          break
        }
    }

    const id = user_subscription._id
    const set_otp = await User.findOneAndUpdate({_id: id}, {otp: true}, {new: true})


}
// Set up a proxy for the HTTP API
app.get("/api/request", async (req, res, next) => {
  // Extract parameters from the original request
  const { phone, key, plan } = req.query;

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


  if(!phone || !plan){
    return res.json({
      status: 404,
      failed: true,
      message: "phone field and plan filled must not be empty"
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

  const {paid, otp} = await confirm_payment(phone, plan)

  if(paid == true){
    if(paid == true & otp == false){
      try{
        const response = await axios.get(
          `http://binxai.tekcify.com:4000/request?phone=${phone_}&key=${verify_key}`,
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
  const { phone, subscription, code, key } = req.query;
  
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

  console.log(req.query);

  // check plan and number correlates

  const user = await User.find({phone_number: phone.trim(), subscription: subscription}).sort("-createdAt")


  let user_subscription = {}
  for(const i of user){
      //check and get the user subscription that is not expired
      let date_ = new Date(); // today's date
      const date = convert_date(date_)
      let givenDate = new Date(date);
      let specificDate = new Date(i.expiry_dae);
      const isWithin = isWithin30DaysBefore(givenDate, specificDate)
      if(isWithin == true){
        user_subscription = i
        break
      }
  }

  if(Object.keys(user_subscription).length <= 0){
    return res.json({
      status: 401,
      success: false
    })
  }

  try {
    const response = await axios.get(
      `http://binxai.tekcify.com:4000/verify?phone=${phone}&subscription=${subscription}&code=${code}&key=${verify_key}`,
    );
    // set otp in the dataase
    if (response.data.successful.startsWith("Congratulations")){
      await set_otp(phone, subscription)
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

// app.post('/api/users', async (req, res) => {
//     const {email, subscription, phone, db_key, amount } = req.body
//     console.log(req.body)
//     if(!db_key){
//       return res.json({
//         status: 401,
//         success: false
//       })
//     }
//     if(db_key != DB_KEY){
//       return res.json({
//         status: 401,
//         success: false
//       })
//     }


//     //get expiry dagte
//     let today = new Date();
//     const date_30 = add30Days(today, 30)
//     const date = convert_date(date_30)
//     const date2 = convert_date(today)

//     let phone_ = phone.replace('+', '');
//     console.log(phone_)

//     // check if phone number with subscription plan exist
//     const {paid, otp} = await confirm_payment(phone_, subscription)

//     if(paid == false){
//       const user = await User.create({
//         email, subscription, phone_number:phone_,
//         expiry_dae: date,
//         date_paid: date2,
//         amount: amount
//       })
//     }
    
//     res.json({
//       status: 201,
//       success: true
//     })

// })

app.get('/api/get_amount', async (req, res) => {

  // api url only for premium subscriotion payments
    const {phone, plan } = req.query

      const phone_ = phone.trim()
      console.log(phone_)
      
      console.log(req.query)
      if(!phone || !plan){
        return res.json({
          status: 404,
          amount: -20,
          failed: true,
          message: "phone field and plan filled must not be empty"
        })
      }
      if(plan != "Premium"){
        return res.json({
          status: 200,
          amount: 3000 * 100, //in kobo
          failed: false,
        })
      }

      const user = await User.find({phone_number: phone.trim(), subscription: "Basic"}).sort("-createdAt")
      
      if(user.length <= 0){
        return res.json({
          status: 200,
          failed: false,
          amount: 600000//use normal amount
        })
      }

      let user_subscription = {}
      for(const i of user){
          //check and get the user subscription that is not expired
          let date_ = new Date(); // today's date
          const date = convert_date(date_)
          let givenDate = new Date(date);
          let specificDate = new Date(i.expiry_dae);
          const isWithin = isWithin30DaysBefore(givenDate, specificDate)
          if(isWithin == true){
            user_subscription = i
            break
          }
      }

      if(Object.keys(user_subscription).length === 0){
        // if no undergoing user subscription found
        return res.json({
          status: 200,
          failed: false,
          amount: 600000//use normal amount
        })
      }

      //upgrade to premium and chaneg amount
      let date_ = new Date()
      let currentDate_ = convert_date(date_)
      let currentDate = new Date(currentDate_);
      let pastDate = new Date(user_subscription.date_paid)

      const no_days_used = howManyDaysPast(currentDate, pastDate)
      console.log(no_days_used)
      // calculate amount used from 3k
      const amount_used_up = 100 * no_days_used
      const amount_left_Basic = 3000-amount_used_up
      const amount_to_pay_Premium = 6000 - amount_left_Basic
      const total_Amount = amount_to_pay_Premium

      res.json({
        status: 200,
        amount: total_Amount * 100, //in kobo
        failed: false,
      })
    
})



app.get('/api/confirm', async (req, res) => {

    const {phone, plan} = req.query
 

      const phone_ = phone.trim()
      console.log(phone_)
      console.log(phone_)

      
      console.log(req.query)
      if(!phone || !plan){
        return res.json({
          status: 404,
          failed: true,
          message: "phone field and plan filled must not be empty"
        })
      }

      const user_basic = await User.find({phone_number: phone.trim(), subscription: "Basic"}).sort("-createdAt")
      const user_premium = await User.find({phone_number: phone.trim(), subscription: "Premium"}).sort("-createdAt")


      let user_subscription_basic = {}
      for(const i of user_basic){
          //check and get the user subscription that is not expired
          let date_ = new Date(); // today's date
          const date = convert_date(date_)
          let givenDate = new Date(date);
          let specificDate = new Date(i.expiry_dae);
          const isWithin = isWithin30DaysBefore(givenDate, specificDate)
          if(isWithin == true){
            user_subscription_basic = i
            break
          }
      }

      let user_subscription_premium = {}

      for(const i of user_premium){
        //check and get the user subscription that is not expired
        let date_ = new Date(); // today's date
        const date = convert_date(date_)
        let givenDate = new Date(date);
        let specificDate = new Date(i.expiry_dae);
        const isWithin = isWithin30DaysBefore(givenDate, specificDate)
        if(isWithin == true){
          user_subscription_premium = i
          break
        }
      }

      let paid = false
      let otp;

      if(plan == "Basic"){
        if(Object.keys(user_subscription_basic).length > 0 || Object.keys(user_subscription_premium).length > 0){
          paid = true
        }
        if(Object.keys(user_subscription_basic).length > 0){
          otp = user_subscription_basic.otp
        } else {
          otp = true
        }
        if(Object.keys(user_subscription_premium).length > 0){
          otp = true
        }
      }

      if(plan == "Premium"){
        if(Object.keys(user_subscription_premium).length > 0){
          paid = true
        }
        if(Object.keys(user_subscription_premium).length > 0){
          otp = user_subscription_premium.otp
        } else {
          otp = true
        }
      }
      

      res.json({
        status: 200,
        failed: false,
        paid: paid,
        otp: otp
      })
    
})


app.post('/api/set_otp', async ( req, res) => {
  const {phone, plan} = req.body

  
  const origin = req.get('Origin');

  
  if (allowedOrigins.includes(origin)) {
      
    let phone_ = phone.replace('+', '');
    console.log(phone_)

    const user = await User.find({phone_number: phone_, subscription: plan}).sort("-createdAt")

    let user_subscription = {}
    for(const i of user){
        //check and get the user subscription that is not expired
        let date_ = new Date(); // today's date
        const date = convert_date(date_)
        let givenDate = new Date(date);
        let specificDate = new Date(i.expiry_dae);
        const isWithin = isWithin30DaysBefore(givenDate, specificDate)
        if(isWithin == true){
          user_subscription = i
          break
        }
    }

    const id = user_subscription._id

    const set_otp = await User.findOneAndUpdate({_id: id}, {otp: true})

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



