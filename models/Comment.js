let mongoose = require('mongoose');

let CommentSchema = new mongoose.Schema({
  body: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }
}, {timestamps: true});

// Requires population of creator
CommentSchema.methods.toJSONFor = function(user){
  return {
    id: this._id,
    body: this.body,
    createdAt: this.createdAt,
    creator: this.creator.toProfileJSONFor(user)
  };
};

mongoose.model('Comment', CommentSchema);
