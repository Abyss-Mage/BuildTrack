import { ApiError } from '../utils/ApiError.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized to perform this action.`
        )
      );
    }

    next();
  };
}
