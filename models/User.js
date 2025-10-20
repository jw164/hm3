const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '用户名为必填项'],
      trim: true,
      minlength: [2, '用户名至少需要 2 个字符'],
      maxlength: [50, '用户名不能超过 50 个字符']
    },
    email: {
      type: String,
      required: [true, '邮箱为必填项'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        '请输入有效的邮箱地址'
      ]
    },
    age: {
      type: Number,
      min: [0, '年龄不能为负数'],
      max: [150, '年龄不能超过 150']
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'manager'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 虚拟属性：获取该用户的所有任务
userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'userId'
});

// 删除用户时，同时删除其所有任务
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  await this.model('Task').deleteMany({ userId: this._id });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;

