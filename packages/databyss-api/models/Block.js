const mongoose = require('mongoose')

const Schema = mongoose.Schema

const BlockSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  type: {
    type: String,
  },
  entryId: {
    type: Schema.Types.ObjectId,
    ref: 'entry',
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'source',
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'author',
  },
})

const Block = mongoose.models.Block || mongoose.model('block', BlockSchema)

module.exports = Block
