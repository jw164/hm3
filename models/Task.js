// models/Task.js
const mongoose = require('mongoose');

const STATUSES = ['pending', 'in-progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true },

    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium', index: true },

    dueDate: { type: Date, required: true, index: true },

    // 允许不分配用户（前端会显示 Unassigned）
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    estimatedHours: { type: Number, min: 0 },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// 文本索引：支持 /api/tasks/search 的关键字查询
TaskSchema.index({ title: 'text', description: 'text' });
TaskSchema.index({ tags: 1 });
TaskSchema.index({ status: 1, priority: 1 });

TaskSchema.statics.STATUSES = STATUSES;
TaskSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.model('Task', TaskSchema);

