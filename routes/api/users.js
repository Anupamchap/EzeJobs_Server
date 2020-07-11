let mongoose = require('mongoose');
let router = require('express').Router();
let passport = require('passport');
let User = mongoose.model('User');
let auth = require('../auth');

router.get('/user', auth.required, function(req, res, next){
  if(req.query.usertype)
  {User.find({usertype: req.query.usertype}).then(function(users){
    
    
    
    return res.json({
      users: users.map(function(user){
        if(!user){ return res.sendStatus(401); }
    user.image= user.image == undefined?'/favicon.PNG':user.image
        return user.toAuthJSON(user);
      }),
      
    });
    
    //return res.json({user: user.toAuthJSON()});
  }).catch(next);
}
else{


  User.findById(req.payload.id).then(function(user){
    if(!user){ return res.sendStatus(401); }
    user.image= user.image == undefined?'/favicon.PNG':user.image
    return res.json({user: user.toAuthJSON()});
  }).catch(next);}
});

router.put('/user', auth.required, function(req, res, next){
  console.log(req.payload.id, req.body)
  User.findById(req.payload.id).then(function(user){
    if(!user){ return res.sendStatus(401); }
    console.log(req.body.user);
    // only update fields that were actually passed...
    if(typeof req.body.user.username !== 'undefined'){
      user.username = req.body.user.username;
    }
    if(typeof req.body.user.email !== 'undefined'){
      user.email = req.body.user.email;
    }
    if(typeof req.body.user.bio !== 'undefined'){
      user.bio = req.body.user.bio;
    }
    if(typeof req.body.user.image !== 'undefined'){
      user.image = req.body.user.image;
    }
    if(typeof req.body.user.password !== 'undefined'){
      user.setPassword(req.body.user.password);
    }

    if(typeof req.body.user.workexperience !== 'undefined'){
      user.workexperience = req.body.user.workexperience;
    }
    if(typeof req.body.user.jobtype !== 'undefined'){
      user.jobtype = req.body.user.jobtype;
    }
    if(typeof req.body.user.highestqualification !== 'undefined'){
      user.highestqualification = req.body.user.highestqualification;
    }
    if(typeof req.body.user.degree !== 'undefined'){
      user.degree = req.body.user.degree;
    }
    if(typeof req.body.user.coverletter !== 'undefined'){
      user.coverletter = req.body.user.coverletter;
    }
    if(typeof req.body.user.tagList !== 'undefined'){
      user.tagList = req.body.user.tagList;
    }


    if(typeof req.body.user.organization !== 'undefined'){
      user.organization = req.body.user.organization;
    }
    if(typeof req.body.user.numberofemployees !== 'undefined'){
      user.numberofemployees = req.body.user.numberofemployees;
    }
    if(typeof req.body.user.establishedin !== 'undefined'){
      user.establishedin = req.body.user.establishedin;
    }
    if(typeof req.body.user.country !== 'undefined'){
      user.country = req.body.user.country;
    }
    if(typeof req.body.user.aboutcompany !== 'undefined'){
      user.aboutcompany = req.body.user.aboutcompany;
    }




    return user.save().then(function(){
      return res.json({user: user.toAuthJSON()});
    });
  }).catch(next);
});

router.post('/users/login', function(req, res, next){
  if(!req.body.user.email){
    return res.status(422).json({errors: {email: "can't be blank"}});
  }

  if(!req.body.user.password){
    return res.status(422).json({errors: {password: "can't be blank"}});
  }

  passport.authenticate('local', {session: false}, function(err, user, info){
    if(err){ return next(err); }

    if(user){
      user.token = user.generateJWT();
      user.image= user.image === undefined?'/favicon.PNG':user.image
      return res.json({user: user.toAuthJSON()});
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);
});

router.post('/users', function(req, res, next){
  let user = new User();
  user.usertype = req.body.user.usertype;
  user.username = req.body.user.username;
  user.email = req.body.user.email;
  user.setPassword(req.body.user.password);

  user.save().then(function(){
    user.image= user.image === undefined?'/favicon.PNG':user.image
    return res.json({user: user.toAuthJSON()});
  }).catch(next);
});

module.exports = router;
