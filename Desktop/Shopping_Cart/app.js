var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var hbs = require('express-handlebars');
var app = express();
var db = require('./config/connection');
var session = require('express-session');
const Handlebars = require('handlebars');
const flash = require('connect-flash');
const userHelpers = require('./helpers/user-helpers');
const { query } = require('express');
const Fuse = require('fuse.js');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialDir: __dirname + '/views/partials/' }))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({ secret: "Key", cookie: { maxAge: 600000 } }))
db.connect((err) => {
  if (err) {
    console.log("database not connected" + err);
  } else {
    console.log("database is connected")
  }
})
Handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});
app.use(flash());
app.use('/', usersRouter);
app.use('/admin', adminRouter);

app.get('/search', async (req, res) => {
  const query = req.query.q;

  // Get products from the database using userHelpers.getAllProducts()
  const products = await userHelpers.getAllProducts();

  // Set up Fuse.js options
  const fuseOptions = {
    keys: ['name', 'category'], // Adjust the fields to search in
    threshold: 0.4, // Adjust this value based on your needs
  };

  // Initialize Fuse with products and options
  const fuse = new Fuse(products, fuseOptions);

  // Perform the search
  const searchResults = fuse.search(query);

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1
  res.setHeader('Pragma', 'no-cache'); // HTTP 1.0
  res.setHeader('Expires', '0'); // Proxies

  res.render('search', { searchResults });
});

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
})


module.exports = app;
