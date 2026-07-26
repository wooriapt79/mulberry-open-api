const mongoose = require('mongoose');

const UserVisitSchema = new mongoose.Schema({
  plusfriendUserKey: { type: String, required: true, unique: true },
  firstVisit:        { type: Date, default: Date.now },
  lastVisit:         { type: Date, default: Date.now },
  visitCount:        { type: Number, default: 1 },
});

UserVisitSchema.statics.checkAndRecord = async function (key) {
  const existing = await this.findOne({ plusfriendUserKey: key });
  if (!existing) {
    await this.create({ plusfriendUserKey: key });
    return { isFirst: true };
  }
  await this.updateOne(
    { plusfriendUserKey: key },
    { $set: { lastVisit: new Date() }, $inc: { visitCount: 1 } }
  );
  return { isFirst: false };
};

module.exports = mongoose.model('UserVisit', UserVisitSchema);
