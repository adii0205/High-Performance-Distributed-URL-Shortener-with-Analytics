/**
 * Request validation middleware using Joi
 */
const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      error.statusCode = 400;
      error.isJoi = true;
      return next(error);
    }

    req.validatedData = value;
    next();
  };
}

// Validation schemas
const createURLSchema = Joi.object({
  originalUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Must be a valid URL',
      'any.required': 'originalUrl is required',
    }),
  customAlias: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .optional()
    .messages({
      'string.alphanum': 'Custom alias must contain only letters and numbers',
      'string.min': 'Custom alias must be at least 3 characters',
    }),
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  expiresAt: Joi.date().iso().optional(),
  customDomain: Joi.string().domain().optional(),
});

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

module.exports = {
  validate,
  createURLSchema,
  analyticsQuerySchema,
};
