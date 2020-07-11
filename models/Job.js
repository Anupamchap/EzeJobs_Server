let mongoose = require('mongoose');
let uniqueValidator = require('mongoose-unique-validator');
let slug = require('slug');
let User = mongoose.model('User');

let JobSchema = new mongoose.Schema({
  slug: {type: String, lowercase: true, unique: true},
  title: String,
  description: String,
  body: String,
  workexperience: String,
  jobtype: String,
  favoritesCount: {type: Number, default: 0},
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  tagList: [{ type: String }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {timestamps: true});

JobSchema.plugin(uniqueValidator, {message: 'is already taken'});

JobSchema.pre('validate', function(next){
  if(!this.slug)  {
    this.slugify();
  }

  next();
});

JobSchema.methods.slugify = function() {
  this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
};

JobSchema.methods.updateFavoriteCount = function() {
  let job = this;

  return User.count({favorites: {$in: [job._id]}}).then(function(count){
    job.favoritesCount = count;

    return job.save();
  });
};

JobSchema.methods.toJSONFor = function(user){
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    workexperience: this.workexperience,
    jobtype: this.jobtype,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    tagList: this.tagList,
    favorited: user ? user.isFavorite(this._id) : false,
    favoritesCount: this.favoritesCount,
    creator: this.creator.toProfileJSONFor(user)
  };
};

mongoose.model('Job', JobSchema);
