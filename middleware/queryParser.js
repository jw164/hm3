/**
 * 查询解析中间件
 * 支持 where、sort、skip、limit、select 等查询参数
 */
const parseQuery = (req, res, next) => {
  try {
    // 解析 where 条件
    if (req.query.where) {
      try {
        req.parsedQuery = {
          where: typeof req.query.where === 'string' 
            ? JSON.parse(req.query.where) 
            : req.query.where
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'where 参数格式错误，必须是有效的 JSON',
          error: error.message
        });
      }
    } else {
      req.parsedQuery = { where: {} };
    }

    // 解析 sort 排序
    if (req.query.sort) {
      try {
        req.parsedQuery.sort = typeof req.query.sort === 'string'
          ? JSON.parse(req.query.sort)
          : req.query.sort;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'sort 参数格式错误，必须是有效的 JSON',
          error: error.message
        });
      }
    }

    // 解析 skip 分页偏移
    if (req.query.skip) {
      const skip = parseInt(req.query.skip);
      if (isNaN(skip) || skip < 0) {
        return res.status(400).json({
          success: false,
          message: 'skip 参数必须是非负整数'
        });
      }
      req.parsedQuery.skip = skip;
    }

    // 解析 limit 限制数量
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'limit 参数必须是 1-100 之间的整数'
        });
      }
      req.parsedQuery.limit = limit;
    }

    // 解析 select 选择字段
    if (req.query.select) {
      try {
        const select = typeof req.query.select === 'string'
          ? JSON.parse(req.query.select)
          : req.query.select;
        
        // 支持数组或对象格式
        if (Array.isArray(select)) {
          req.parsedQuery.select = select.join(' ');
        } else if (typeof select === 'object') {
          req.parsedQuery.select = select;
        } else {
          req.parsedQuery.select = select;
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'select 参数格式错误',
          error: error.message
        });
      }
    }

    // 解析 populate 关联查询
    if (req.query.populate) {
      try {
        req.parsedQuery.populate = typeof req.query.populate === 'string'
          ? JSON.parse(req.query.populate)
          : req.query.populate;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'populate 参数格式错误',
          error: error.message
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询参数解析失败',
      error: error.message
    });
  }
};

module.exports = parseQuery;

