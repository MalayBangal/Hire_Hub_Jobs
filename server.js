//* 1 require.

const express = require('express');
const path = require('path'); // require path for public files
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const dotenv = require('dotenv');// require dotenv, we nont comfromise our sicurity, it will save securlty connection string of mongodb.
dotenv.config(); //use dotenv packeg.
const session = require('express-session');
const passport = require('passport');
const localStrategy = require('passport-local');
const flash = require('connect-flash');
const moment = require('moment');


const app = express();

//* 2 data base connection.

mongoose.connect(process.env.DB_URI)//(process.env) for process DB_URI variable from .env file.
.then(() =>{
    console.log("db connected");
})
.catch((error)=>{
    console.log(error);
});


//* 3 session and othantication.

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        // httpOnly:true,
        secure:true,
        maxAge:1000*60*60*24
    }
}));

//*3.1 passport setup
const User = require('./models/user'); //model of user needed for passport setup;

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//* 4 server configration.
// flash setup
app.use(flash());
// use methodOverride for other request (like patch,delete).
app.use(methodOverride('_method'));
// use static file in express telling that.
app.use(express.static(path.join(__dirname, 'public')));
// for HTML form enctype , enctype ==> urlencoded here defalt.
app.use(express.urlencoded({ extended: true }));
// telling express all "view" file with .ejs extention. ebar amde .ejs deyar dorkar nai
app.set("view engine", "ejs");



// global middleware
app.use((req, res, next) => {
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	res.locals.currentUser = req.user;
    res.locals.moment = moment;
	next();
});

const jobRouts = require('./router/routjob');// require and use job router.
app.use(jobRouts);
const notifRoute = require('./router/notification');
app.use(notifRoute);
const authRoute = require('./router/auth');
app.use(authRoute);
const userRoutes = require('./router/user');
app.use(userRoutes);
const questionRoute = require('./router/questions');
app.use(questionRoute);

//* 5 API making.

// app.get("/",(req,res)=>{ //landing page route.
//     res.send("working");
// });


app.get("*",(req,res) =>{ // Handeling invalid URL.
    // res.send("page notfound 404");
    res.render('errorpage/notfound404');
});

//* 6 server listen.
const port =process.env.PORT;
app.listen(port,()=>{
    console.log("server running at port no 3000"); // 3000 safe port choice.
});
