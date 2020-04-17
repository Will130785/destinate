//Require packages and models
let express = require("express");
let mongoose = require("mongoose");
let port = process.env.PORT || 3000;
let bodyParser = require("body-parser");
let flash = require("connect-flash");
let passport = require("passport");
let localStrategy = require("passport-local");
let methodOverride = require("method-override");
let Destination = require("./models/destination");
let Comment = require("./models/comment");
let User = require("./models/user");
let app = express();


//SET TEMPLATE ENGINE
app.set("view engine", "ejs");
//DEFINE STATIC FILE LOCATION
app.use(express.static("public"));
//SET MONGO DB LOCATION
// mongoose.connect("mongodb://localhost/destinate", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect("mongodb+srv://will_constable:GC161113@cluster0-dsket.mongodb.net/destinate?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});
//USE BODY PARSER
app.use(bodyParser.urlencoded({extended: true}));
//USE METHOD OVERRIDE
app.use(methodOverride("_method"));
//USE FLASH
app.use(flash());
//PASPORT CONFIGURATION
app.use(require("express-session")({
    secret: "This is the greatest site",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Make current user available to all files
app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// let dest = {
//     destination: "New York",
//         image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=900&q=60",
//         description: "New York, the largest city in the U.S., is an architectural marvel with plenty of historic monuments, magnificent buildings and countless dazzling skyscrapers. Besides the architectural delights, New York is an urban jungle that has everything to offer to visitors."
// }

// Destination.create(dest, function(err, newlyCreatedDest) {
//     if(err) {
//         console.log(err);
//     } else {
//         console.log(newlyCreatedDest);
//     }
// });



//ROUTES
//ROOT
app.get("/", function(req, res) {
    res.render("landing");
});

//INDEX
app.get("/destinations", function(req, res) {
    Destination.find({}, function(err, allDestinations) {
        if(err) {
            console.log(err);
        } else {
            res.render("destinations/index", {data: allDestinations});
        }
    });
});
//NEW
app.get("/destinations/new", isLoggedIn, function(req, res) {
    res.render("destinations/new");
});
//CREATE
app.post("/destinations", isLoggedIn, function(req, res) {
    //Capture data
    let destination = req.body.destination;
    let imgage = req.body.image;
    let description = req.body.description;
    //Create author object and capture user data
    let author = {
        id: req.user._id,
        username: req.user.username
    };

        //Create new destination object
    let newDestination = {
        destination: destination,
        image: imgage,
        description: description,
        author: author
    };

    //Create new destination in database
    Destination.create(newDestination, function(err, newlyCreatedDest){
        if(err) {
            console.log(err);
        } else {
            req.flash("success", "New destination added")
            res.redirect("/destinations");
        }
    });
});

//SHOW
app.get("/destinations/:id", function(req, res) {
    //Find correct destination
    Destination.findById(req.params.id).populate("comments").exec(function(err, foundDestination) {
        if(err || !foundDestination) {
            req.flash("error", "Destination not found")
            console.log(err);
        } else {
            res.render("destinations/show", {destination: foundDestination});
        }
    });
});
//EDIT
app.get("/destinations/:id/edit", checkDestinationOwnership, function(req, res) {
    //Find correct destination to edit
    Destination.findById(req.params.id, function(err, foundDestination) {
        if(err) {
            console.log(err);
        } else {
            res.render("destinations/edit", {destination: foundDestination});
        }
    });
});
//UPDATE
app.put("/destinations/:id", checkDestinationOwnership, function(req, res) {

        //Find and update in database
    Destination.findByIdAndUpdate(req.params.id, req.body.place, function(err, updatedDestination) {
        if(err) {
            console.log(err);
        } else {
            req.flash("success", "Destination updated");
            res.redirect(`/destinations/${req.params.id}`);
        }
    });
});

//DESTROY
app.delete("/destinations/:id", checkDestinationOwnership, function(req, res) {
    //Find and remove from database
    Destination.findById(req.params.id, function(err, destination) {
        if(err) {
            console.log(err);
        } else {
            destination.remove();
            req.flash("success", "Destination deleted");
            res.redirect("/destinations");
        }
    });
});

//NEW COMMENT
app.get("/destinations/:id/comments/new", isLoggedIn, function(req, res) {
    //Find correct destination to add new comment
    Destination.findById(req.params.id, function(err, destination) {
        if(err) {
            console.log(err);
        } else {
            res.render("comments/new", {destination: destination});
        }
    });
});

//CREATE COMMENT
app.post("/destinations/:id/comments", isLoggedIn, function(req, res) {
    //Create the comment and save to the database
    Destination.findById(req.params.id, function(err, destination) {
        if(err) {
            req.flash("error", "Something went wrong");
            console.log(err);
            res.redirect("/destinations");
        } else {
            //Create new comment and save to database
            Comment.create(req.body.comment, function(err, comment) {
                if(err) {
                    console.log(err);
                } else {
                    //Add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    //Save comment
                    comment.save();
                    //Associate comment with corresponding destination
                    destination.comments.push(comment);
                    //Save detination
                    destination.save();
                    req.flash("success", "Successfully added comment");
                    res.redirect(`/destinations/${destination._id}`);
                }
            });
        }
    })
});

//COMMENT UPDATE and EDIT
app.get("/destinations/:id/comments/:comment_id/edit", checkCommentOwnership, function(req, res) {
    Destination.findById(req.params.id, function(err, foundDestination) {
        if(err || !foundDestination) {
            req.flash("error", "Destination not found");
            return res.redirect("back");
        } 

        Comment.findById(req.params.comment_id, function(err, foundDestination) {
            if(err) {
                res.redirect("back");
            } else {
                res.render("comments/edit", {destination_id: req.params.id, comment: foundDestination});
            }
        });
    })
});

app.put("/destinations/:id/comments/:comment_id", checkCommentOwnership, function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment) {
        if(err) {
            console.log(err);
        } else {
            req.flash("success", "Comment updated");
            res.redirect(`/destinations/${req.params.id}`);
        }
    });
});

//DELETE COMMENT
app.delete("/destinations/:id/comments/:comment_id", checkCommentOwnership, function(req, res) {
    Comment.findByIdAndRemove(req.params.comment_id, function(err) {
        if(err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment deleted")
            res.redirect(`/destinations/${req.params.id}`);
        }
    });
});

//AUTH ROUTES
//REGISTER
app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {
    //Create new user
    let newUser = new User({username: req.body.username});
    //Register user
    User.register(newUser, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            return res.render("register");
        } else {
            //Authenticate user with passport-local
            passport.authenticate("local")(req, res, function() {
                req.flash("success", "You have been successfully registered");
                res.redirect("/destinations");
            });
        }
    });
});

//LOGIN
app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", passport.authenticate("local", 
{
    successRedirect: "/destinations",
    failureRedirect: "/login"
}), function(req, res) {
});

//LOGOUT
app.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "You have been logged out");
    res.redirect("/destinations");
});

//WRONG PAGE
app.get("*", function(req, res) {
    res.send("This page does not exist!!!");
});

//Middleware
function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to sign in");
    res.redirect("/login");
};

function checkDestinationOwnership(req, res, next) {
    //Check user is logged in
    if(req.isAuthenticated()) {
        //if yes, find destination
        Destination.findById(req.params.id, function(err, foundDestination) {
            if(err || !foundDestination) {
                req.flash("error", "You do not have permission to do that");
                res.redirect("back");
            } else {
                if(foundDestination.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You do not have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You do not have permission to do that");
        res.redirect("back");
    }
};

function checkCommentOwnership(req, res, next) {
    //Check user is logged in
    if(req.isAuthenticated()) {
        //if yes, find comment
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if(err || !foundComment) {
                req.flash("error", "You do not have permission to do that");
                res.redirect("back");
            } else {
                if(foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You do not have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You do not have permission to do that");
        res.redirect("back");
    }
};


//SERVER
app.listen(port, function() {
    console.log("The server has started");
});


//TEST DATA
// let data = [
//     {
//         destination: "Barcelona",
//         image: "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=900&q=60",
//         description: "Barcelona is cradled in the North Eastern Mediterranean coast of mainland Spain, about 2 hours drive South from the French Pyrenees. It's the capital of Catalunya, a region of Northern Spain that has its own unique culture, traditions and personality."
//     },
//     {
//         destination: "Porto",
//         image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=900&q=60",
//         description: "The city lies along the Douro River, 2 miles (3 km) from the river's mouth on the Atlantic Ocean and 175 miles (280 km) north of Lisbon. World-famous for its port wine, Porto is Portugal's second largest city and is the commercial and industrial centre for the zone north of the Mondego River."
//     },
//     {
//         destination: "New York",
//         image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=900&q=60",
//         description: "New York, the largest city in the U.S., is an architectural marvel with plenty of historic monuments, magnificent buildings and countless dazzling skyscrapers. Besides the architectural delights, New York is an urban jungle that has everything to offer to visitors."
//     },
//     {
//         destination: "London",
//         image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=900&q=60",
//         description: "London is the capital and largest city of England and the United Kingdom. Standing on the River Thames in the south-east of England, at the head of its 50-mile (80 km) estuary leading to the North Sea, London has been a major settlement for two millennia. Londinium was founded by the Romans."
//     }
// ];