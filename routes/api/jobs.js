let router = require('express').Router();
let mongoose = require('mongoose');
let Job = mongoose.model('Job');
let Comment = mongoose.model('Comment');
let User = mongoose.model('User');
let auth = require('../auth');

// Preload job objects on routes with ':job'
router.param('job', function(req, res, next, slug) {
  Job.findOne({ slug: slug})
    .populate('creator')
    .then(function (job) {
      if (!job) { return res.sendStatus(404); }

      req.job = job;

      return next();
    }).catch(next);
});

router.param('comment', function(req, res, next, id) {
  Comment.findById(id).then(function(comment){
    if(!comment) { return res.sendStatus(404); }

    req.comment = comment;

    return next();
  }).catch(next);
});

router.get('/', auth.optional, function(req, res, next) {
  let query = {};
  let limit = 20;
  let offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  if( typeof req.query.tag !== 'undefined' ){
    query.tagList = {"$in" : [req.query.tag]};
  }

  Promise.all([
    req.query.creator ? User.findOne({username: req.query.creator}) : null,
    req.query.favorited ? User.findOne({username: req.query.favorited}) : null
  ]).then(function(results){
    let creator = results[0];
    let favoriter = results[1];

    if(creator){
      query.creator = creator._id;
    }

    if(favoriter){
      query._id = {$in: favoriter.favorites};
    } else if(req.query.favorited){
      query._id = {$in: []};
    }

    return Promise.all([
      Job.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({createdAt: 'desc'})
        .populate('creator')
        .exec(),
      Job.countDocuments(query).exec(),
      req.payload ? User.findById(req.payload.id) : null,
    ]).then(function(results){
      let jobs = results[0];
      let jobsCount = results[1];
      let user = results[2];

      return res.json({
        jobs: jobs.map(function(job){
          return job.toJSONFor(user);
        }),
        jobsCount: jobsCount
      });
    });
  }).catch(next);
});

router.get('/feed', auth.required, function(req, res, next) {
  let limit = 20;
  let offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    Promise.all([
      Job.find({ creator: {$in: user.following}})
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('creator')
        .exec(),
      Job.countDocuments({ creator: {$in: user.following}})
    ]).then(function(results){
      let jobs = results[0];
      let jobsCount = results[1];

      return res.json({
        jobs: jobs.map(function(job){
          return job.toJSONFor(user);
        }),
        jobsCount: jobsCount
      });
    }).catch(next);
  });
});

router.post('/', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }
    console.log(req.body.job);
    let job = new Job(req.body.job);

    job.creator = user;

    return job.save().then(function(){
      console.log(job.creator);
      return res.json({job: job.toJSONFor(user)});
    });
  }).catch(next);
});

// return a job
router.get('/:job', auth.optional, function(req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.job.populate('creator').execPopulate()
  ]).then(function(results){
    let user = results[0];

    return res.json({job: req.job.toJSONFor(user)});
  }).catch(next);
});

// update job
router.put('/:job', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(req.job.creator._id.toString() === req.payload.id.toString()){
      if(typeof req.body.job.title !== 'undefined'){
        req.job.title = req.body.job.title;
      }

      if(typeof req.body.job.description !== 'undefined'){
        req.job.description = req.body.job.description;
      }

      if(typeof req.body.job.body !== 'undefined'){
        req.job.body = req.body.job.body;
      }

      if(typeof req.body.job.tagList !== 'undefined'){
        req.job.tagList = req.body.job.tagList
      }

      req.job.save().then(function(job){
        return res.json({job: job.toJSONFor(user)});
      }).catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

// delete job
router.delete('/:job', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    if(req.job.creator._id.toString() === req.payload.id.toString()){
      return req.job.remove().then(function(){
        return res.sendStatus(204);
      });
    } else {
      return res.sendStatus(403);
    }
  }).catch(next);
});

// Favorite an job
router.post('/:job/favorite', auth.required, function(req, res, next) {
  let jobId = req.job._id;

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    return user.favorite(jobId).then(function(){
      return req.job.updateFavoriteCount().then(function(job){
        return res.json({job: job.toJSONFor(user)});
      });
    });
  }).catch(next);
});

// Unfavorite an job
router.delete('/:job/favorite', auth.required, function(req, res, next) {
  let jobId = req.job._id;

  User.findById(req.payload.id).then(function (user){
    if (!user) { return res.sendStatus(401); }

    return user.unfavorite(jobId).then(function(){
      return req.job.updateFavoriteCount().then(function(job){
        return res.json({job: job.toJSONFor(user)});
      });
    });
  }).catch(next);
});

// return an job's comments

router.get('/:job/comments', auth.optional, function(req, res, next){
  console.log(req)
  let username;
  let usertype;

  if(typeof req.query.username !== 'undefined'){
    username = req.query.username;
  }

  if(typeof req.query.usertype !== 'undefined'){
    usertype = req.query.usertype;
  }



console.log(username, usertype)
if(usertype !=='recruiter'){  
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.job.populate({ 
      path: 'comments',
      populate: {
        path: 'creator',        
      },
      options: {
        sort: {
          createdAt: 'desc'
        },
      }
    }).execPopulate().then(function(job) {
      return res.json({comments: req.job.comments.filter(function(comment) {
        return comment.creator.username===username;
      }).map(function(comment){
        console.log(comment)
        console.log(comment.creator.username,username)
        //if(comment.creator.username===username){
        //  console.log(comment)
        return comment.toJSONFor(user);
        //}

      })});
    });
  }).catch(next);
}
else{
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.job.populate({
      path: 'comments',
      populate: {
        path: 'creator'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then(function(job) {
      return res.json({comments: req.job.comments.map(function(comment){
        return comment.toJSONFor(user);
      })});
    });
  }).catch(next);
}
});

/*
router.get('/comments', auth.optional, function(req, res, next){
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.job.populate({
      path: 'comments',
      populate: {
        path: 'creator'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then(function(job) {
      return res.json({comments: req.job.comments.map(function(comment){
        return comment.toJSONFor(user);
      })});
    });
  }).catch(next);
});

*/

// create a new comment
router.post('/:job/comments', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(!user){ return res.sendStatus(401); }

    let comment = new Comment(req.body.comment);
    comment.job = req.job;
    comment.creator = user;

    return comment.save().then(function(){
      req.job.comments.push(comment);

      return req.job.save().then(function(job) {
        res.json({comment: comment.toJSONFor(user)});
      });
    });
  }).catch(next);
});

router.delete('/:job/comments/:comment', auth.required, function(req, res, next) {
  if(req.comment.creator.toString() === req.payload.id.toString()){
    req.job.comments.remove(req.comment._id);
    req.job.save()
      .then(Comment.find({_id: req.comment._id}).remove().exec())
      .then(function(){
        res.sendStatus(204);
      });
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;
