var express = require("express");
var app = express();
var path = require("path");
var crypto = require("crypto");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
const bcrypt = require("bcryptjs");
// const session = require("express-session");
const flash = require("connect-flash");
var LocalStrategy = require("passport-local");
var User = require("./models/user");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");

passport.use(
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    // Match user
    User.findOne({
      email: email,
    }).then((user) => {
      if (!user) {
        return done(null, false, { message: "That email is not registered" });
      }

      // Match password
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Password incorrect" });
        }
      });
    });
  })
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

mongoose
  .connect("mongodb://localhost/sum", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Mongo Connecteed"))
  .catch((err) => console.log(err));

app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/views"));

// app.use(
//   session({
//     secret: "secret",
//     resave: true,
//     saveUninitialized: true,
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());

// Load User model
// app.use(flash());

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});
///////////
var conn = mongoose.createConnection("mongodb://localhost/sum", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//init gfs
let gfs;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  // all set!
});
////create storage
const storage = new GridFsStorage({
  url: "mongodb://localhost/sum",
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });
////route

app.get("/home", function (req, res) {
  req.body.user;

  gfs.files.find().toArray((err, files) => {
    //checck if files exist
    if (!files || files.length === 0) {
      res.render("landing", { files: false });
    } else {
      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("landing", { files: files });
    }
  });
});
/////
///
app.post("/home", upload.single("file"), (req, res) => {
  // res.json({file:req.file});
  res.redirect("/home");
});
///rooute get /files
///displ;ay all files in json
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    //checck if files exist
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "nO files exist",
      });
    }

    ////files exist
    return res.json(files);
  });
});

app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "nO files exist",
      });
    }
    /////
    return res.json(file);
  });
});
////// get/image

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "nO files exist",
      });
    }
    /////cgeck image
    if (file.contentType === "image/jpeg" || file.contentType === "img/png") {
      ////read outot to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "not image",
      });
    }
  });
});

////routes delete
app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    res.redirect("/home");
  });
});

////////////////

////Routes///
app.get("/", function (req, res) {
  res.render("first");
});
// app.get("/home", function(req, res){
//         res.render("landing", { currentUser:req.user });
// });
app.get("/aboutus", function (req, res) {
  res.render("about");
});
//////////////////Auth/////
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/events", function (req, res) {
  res.render("events");
});
app.get("/upcoming", function (req, res) {
  res.render("upcoming");
});
app.get("/past", function (req, res) {
  res.render("past");
});
app.get("/login", (req, res) => res.render("login"));
app.post("/register", function (req, res) {
  const { name, email, password, password2 } = req.body;
  let errors = [];
  //check requird fields
  if (!name || !email || !password || !password2) {
    errors.push({ msg: "please fill in" });
  }
  //chech passwoerd match
  if (password !== password2) {
    errors.push({ msg: "password incorrect" });
  }
  //chech password lenght
  if (password.length < 6) {
    errors.push({ msg: "password should be at least 6 character" });
  }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      email,
      password,
      password2,
    });
  } else {
    // res.send('pass');
    User.findOne({ email: email }).then((user) => {
      if (user) {
        errors.push({ msg: "Email already exists" });
        res.render("register", {
          errors,
          name,
          email,
          password,
          password2,
        });
      } else {
        const newUser = new User({
          name,
          email,
          password,
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then((user) => {
                req.flash(
                  "success_msg",
                  "You are now registered and can log in"
                );
                res.redirect("login");
              })
              .catch((err) => console.log(err));
          });
        });
      }
    });
  }
});

// Login
app.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
});

// Logout
app.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "You are logged out");
  res.redirect("/login");
});

///////log in ///
// app.get("/login", function(req, res){
//     res.render("login");
// });

// app.post("/login", passport.authenticate("local",{
//     successRedirect:"/home",
//     failureRedirect:"/login"
// }), function(req, res){
// });
//////log out////
// app.get("/logout", function(req, res){
//     req.logout();
//     res.redirect("home");
// })
///middleware function///
function isLoggedin(req, res, next) {
  if (req.isAunthenticated()) {
    return next();
  }
  res.redirect("/login");
}

app.listen(process.env.PORT || 3000, function () {
  console.log("SpeakUpMithla");
});
///////////////////////////////
