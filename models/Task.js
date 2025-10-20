const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '任务标题为必填项'],
      trim: true,
      minlength: [3, '任务标题至少需要 3 个字符'],
      maxlength: [200, '任务标题不能超过 200 个字符']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, '任务描述不能超过 1000 个字符']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in-progress', 'completed', 'cancelled'],
        message: '{VALUE} 不是有效的任务状态'
      },
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    dueDate: {
      type: Date,
      required: [true, '截止日期为必填项'],
      validate: {
        validator: function(value) {
          return value >= new Date();
        },
        message: '截止日期不能早于当前日期'
      }
    },
    completedAt: {
      type: Date
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户 ID 为必填项']
    },
    tags: [{
      type: String,
      trim: true
    }],
    estimatedHours: {
      type: Number,
      min: [0, '预估工时不能为负数']
    },
    actualHours: {
      type: Number,
      min: [0, '实际工时不能为负数']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 索引优化查询
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

// 当任务完成时，自动设置完成时间
taskSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;

