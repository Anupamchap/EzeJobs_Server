let router = require('express').Router();
let mongoose = require('mongoose');
let Job = mongoose.model('Job');

// return a list of tags
router.get('/', function(req, res, next) {
  Job.find().distinct('tagList').then(function(tags){
    return res.json({tags: tags});
  }).catch(next);
});

module.exports = router;
