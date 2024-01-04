const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const UserSchema = new Schema({
  id: {
    type: String,
  },
  email:{
    type: String,
    required: [true, 'Please provide an email'],
  },
  subscription:{
    type: String,
    required: [true, 'Please provide a subscription plan'],
  },
  phone_number:{
    type: String,
    required: [true, 'Please provide phone number'],
  },
  date_paid: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Please provide a scheduled date'],
  },
  expiry_dae: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Please provide a scheduled date'],
  },
  otp: {
    type: Boolean,
    default: false
  },
  amount:{
    type: Number,
    default: 0
  }
}, {timestamps: true});

module.exports = mongoose.model('User', UserSchema);