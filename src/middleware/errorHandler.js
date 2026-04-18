import APIResponse from '../utils/response.js';

function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message, err.stack);

  if (err.code === 'PGRST') {
    return res.status(400).json(
      APIResponse.error('DATABASE_ERROR', 'Database error occurred')
    );
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json(
      APIResponse.error('VALIDATION_ERROR', err.message)
    );
  }

  res.status(500).json(
    APIResponse.error('INTERNAL_ERROR', 'Internal server error')
  );
}

export default errorHandler;
