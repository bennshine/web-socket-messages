require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var sql = require('mssql');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// Generate a random secret key for testing
// var secretKey = Math.random().toString(36).substring(2);
//
// console.log('Secret key: ', secretKey);

//var crypto = require('crypto');

// Generate a long static secret key
//var secretKey = crypto.randomBytes(26).toString('hex');


console.log('Secret key: ', process.env.SECRET_KEY);

// Middleware for verifying the secret key
function verifySecret(req, res, next) {
  if (req.headers['x-secret-key'] === process.env.SECRET_KEY) {
    next();
  } else {
    res.sendStatus(403);
  }
}
// app.use(function(req, res, next) {
//   if (req.headers['x-secret-key'] === process.env.SECRET_KEY) {
//     next();
//   } else {
//     res.sendStatus(403);
//   }
// });

// Database configuration
const config = {
  server: '82.165.239.204',
  authentication: {
    type: 'default',
    options: {
      userName: 'visjustice', // update me
      password: 'C0gl10n32023!' // update me
    }
  },
  options: {
    encrypt: false, // <- Add this line
    trustServerCertificate: true // <- Add this line if the server uses a self-signed certificate
  }
};
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


// Add a new route for campaigns
app.get('/api/campaigns', verifySecret, async function (req, res) {
  try {
    let pool = await sql.connect(config)

    // Query to get all campaigns
    let campaigns = await pool.request().query(`
      SELECT 
          Campaign.*, 
          CampaignBudget.Budget AS Target
      FROM 
          Campaign
      INNER JOIN 
          CampaignBudget ON Campaign.Id = CampaignBudget.CampaignId
    `);

    // Query to get all donors
    let donors = await pool.request().query(`
      SELECT 
          CampaignDonations.CampaignId,
          CampaignDonations.DonatedAmount, 
          CampaignDonations.Comments, 
          CampaignDonations.ShowName, 
          CampaignDonations.DateTime,
          Users.FirstName, 
          Users.LastName, 
          Users.Email, 
          Users.ImagePath
      FROM 
          CampaignDonations
      INNER JOIN 
          Users ON CampaignDonations.DonorUserId = Users.Id
    `);

    // Combine the results
    campaigns.recordset.forEach(campaign => {
      campaign.Donors = donors.recordset.filter(donor => donor.CampaignId === campaign.Id);

      // Prepend 'https://beta.visjustice.co.uk/' to every '/upload' in the campaign data
      for (let key in campaign) {
        if (typeof campaign[key] === 'string' && campaign[key].startsWith('/Upload')) {
          campaign[key] = 'https://beta.visjustice.co.uk' + campaign[key];
        }
      }
    });

    res.send(campaigns.recordset);
  } catch (err) {
    console.error('Error: ', err);
    res.status(500).send('Error executing query');
  }
});
app.get('/api/categories', verifySecret, async function (req, res) {
  try {
    let pool = await sql.connect(config)

    // Query to get all categories
    let categories = await pool.request().query(`
      SELECT 
          Id, 
          CategoryName
      FROM 
          Categories
    `);

    res.send(categories.recordset);
  } catch (err) {
    console.error('Error: ', err);
    res.status(500).send('Error executing query');
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
