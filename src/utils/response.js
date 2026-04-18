class APIResponse {
  static success(data, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      },
      error: null
    };
  }

  static error(code, message, details = {}) {
    return {
      success: false,
      data: null,
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  static paginated(items, total_count, limit, offset) {
    return this.success(items, {
      pagination: {
        total_count,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil(total_count / limit)
      }
    });
  }
}

export default APIResponse;
