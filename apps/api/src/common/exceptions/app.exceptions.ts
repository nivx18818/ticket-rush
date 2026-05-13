import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { ErrorCode, getErrorMessage } from '../constants/error-codes';

/**
 * Base App Exception with error code support
 */
export abstract class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    statusCode: HttpStatus,
    message?: string,
  ) {
    super(
      {
        code: errorCode,
        message: message || getErrorMessage(errorCode),
      },
      statusCode,
    );
  }
}

// =====================================
// 400 - Bad Request (Validation Errors)
// =====================================

export class ValidationException extends AppException {
  constructor(errors?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
    if (errors) {
      this.getResponse()['errors'] = errors;
    }
  }
}

export class InvalidEmailException extends BadRequestException {
  constructor() {
    super({
      code: ErrorCode.INVALID_EMAIL,
      message: getErrorMessage(ErrorCode.INVALID_EMAIL),
    });
  }
}

export class InvalidPasswordException extends BadRequestException {
  constructor() {
    super({
      code: ErrorCode.INVALID_PASSWORD,
      message: getErrorMessage(ErrorCode.INVALID_PASSWORD),
    });
  }
}

export class MissingRequiredFieldException extends BadRequestException {
  constructor(fieldName: string) {
    super({
      code: ErrorCode.MISSING_REQUIRED_FIELD,
      message: `${getErrorMessage(ErrorCode.MISSING_REQUIRED_FIELD)}: ${fieldName}`,
    });
  }
}

export class InvalidNameException extends BadRequestException {
  constructor() {
    super({
      code: ErrorCode.INVALID_NAME,
      message: getErrorMessage(ErrorCode.INVALID_NAME),
    });
  }
}

export class InvalidDobException extends BadRequestException {
  constructor() {
    super({
      code: ErrorCode.INVALID_DOB,
      message: getErrorMessage(ErrorCode.INVALID_DOB),
    });
  }
}

export class InvalidGenderException extends BadRequestException {
  constructor() {
    super({
      code: ErrorCode.INVALID_GENDER,
      message: getErrorMessage(ErrorCode.INVALID_GENDER),
    });
  }
}

export class AppBadRequestException extends BadRequestException {
  constructor(message?: string) {
    super({
      code: ErrorCode.BAD_REQUEST,
      message: message || getErrorMessage(ErrorCode.BAD_REQUEST),
    });
  }
}

// ==========================================
// 401 - Unauthorized (Authentication Errors)
// ==========================================

export class AppUnauthorizedException extends UnauthorizedException {
  constructor(message?: string) {
    super({
      code: ErrorCode.UNAUTHORIZED,
      message: message || getErrorMessage(ErrorCode.UNAUTHORIZED),
    });
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super({
      code: ErrorCode.INVALID_ACCESS_TOKEN,
      message: getErrorMessage(ErrorCode.INVALID_ACCESS_TOKEN),
    });
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super({
      code: ErrorCode.ACCESS_TOKEN_EXPIRED,
      message: getErrorMessage(ErrorCode.ACCESS_TOKEN_EXPIRED),
    });
  }
}

export class RefreshTokenInvalidException extends UnauthorizedException {
  constructor() {
    super({
      code: ErrorCode.INVALID_REFRESH_TOKEN,
      message: getErrorMessage(ErrorCode.INVALID_REFRESH_TOKEN),
    });
  }
}

export class MissingAuthenticationException extends UnauthorizedException {
  constructor() {
    super({
      code: ErrorCode.MISSING_AUTHENTICATION,
      message: getErrorMessage(ErrorCode.MISSING_AUTHENTICATION),
    });
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: getErrorMessage(ErrorCode.INVALID_CREDENTIALS),
    });
  }
}

// =================================================
// 403 - Forbidden (Authorization/Permission Errors)
// =================================================

export class AppForbiddenException extends ForbiddenException {
  constructor(message?: string) {
    super({
      code: ErrorCode.FORBIDDEN,
      message: message || getErrorMessage(ErrorCode.FORBIDDEN),
    });
  }
}

// ===============
// 404 - Not Found
// ===============

export class UserNotFoundException extends NotFoundException {
  constructor(identifier: number | string) {
    super({
      code: ErrorCode.USER_NOT_FOUND,
      message: `${getErrorMessage(ErrorCode.USER_NOT_FOUND)}: ${identifier}`,
    });
  }
}

export class EventNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super({
      code: ErrorCode.EVENT_NOT_FOUND,
      message: `${getErrorMessage(ErrorCode.EVENT_NOT_FOUND)}: ${identifier}`,
    });
  }
}
export class AppNotFoundException extends NotFoundException {
  constructor(message?: string) {
    super({
      code: ErrorCode.NOT_FOUND,
      message: message || getErrorMessage(ErrorCode.NOT_FOUND),
    });
  }
}

// ==============
// 409 - Conflict
// ==============

export class EmailAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super({
      code: ErrorCode.EMAIL_ALREADY_EXISTS,
      message: `${getErrorMessage(ErrorCode.EMAIL_ALREADY_EXISTS)}: ${email}`,
    });
  }
}

export class AppConflictException extends ConflictException {
  constructor(message?: string) {
    super({
      code: ErrorCode.CONFLICT,
      message: message || getErrorMessage(ErrorCode.CONFLICT),
    });
  }
}

export class EventNotDraftException extends ConflictException {
  constructor() {
    super({
      code: ErrorCode.EVENT_NOT_DRAFT,
      message: getErrorMessage(ErrorCode.EVENT_NOT_DRAFT),
    });
  }
}

export class ZoneAlreadyExistsException extends ConflictException {
  constructor(eventId: string, zoneName: string) {
    super({
      code: ErrorCode.ZONE_ALREADY_EXISTS,
      message: `${getErrorMessage(ErrorCode.ZONE_ALREADY_EXISTS)}: ${eventId}/${zoneName}`,
    });
  }
}

export class RefreshTokenAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      code: ErrorCode.REFRESH_TOKEN_ALREADY_EXISTS,
      message: getErrorMessage(ErrorCode.REFRESH_TOKEN_ALREADY_EXISTS),
    });
  }
}

// ================
// 429 - Rate Limit
// ================

export class RateLimitExceededException extends HttpException {
  constructor(retryAfter?: number) {
    super(
      {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: getErrorMessage(ErrorCode.RATE_LIMIT_EXCEEDED),
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
export class TooManyRequestsException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCode.TOO_MANY_REQUESTS,
        message: getErrorMessage(ErrorCode.TOO_MANY_REQUESTS),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// ===========================
// 500 - Internal Server Error
// ===========================

export class InternalServerErrorException extends HttpException {
  constructor(message?: string) {
    super(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: message || getErrorMessage(ErrorCode.INTERNAL_SERVER_ERROR),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class DatabaseErrorException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCode.DATABASE_ERROR,
        message: getErrorMessage(ErrorCode.DATABASE_ERROR),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class ExternalServiceErrorException extends HttpException {
  constructor(serviceName?: string) {
    const message = serviceName
      ? `${getErrorMessage(ErrorCode.EXTERNAL_SERVICE_ERROR)}: ${serviceName}`
      : getErrorMessage(ErrorCode.EXTERNAL_SERVICE_ERROR);

    super(
      {
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
        message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export const ErrorCodeToException = {
  // 400 - Bad Request
  [ErrorCode.BAD_REQUEST]: AppBadRequestException,
  [ErrorCode.VALIDATION_ERROR]: ValidationException,
  [ErrorCode.INVALID_EMAIL]: InvalidEmailException,
  [ErrorCode.INVALID_PASSWORD]: InvalidPasswordException,
  [ErrorCode.INVALID_NAME]: InvalidNameException,
  [ErrorCode.INVALID_DOB]: InvalidDobException,
  [ErrorCode.INVALID_GENDER]: InvalidGenderException,
  [ErrorCode.MISSING_REQUIRED_FIELD]: MissingRequiredFieldException,
  // 401 - Unauthorized
  [ErrorCode.UNAUTHORIZED]: AppUnauthorizedException,
  [ErrorCode.INVALID_ACCESS_TOKEN]: InvalidTokenException,
  [ErrorCode.ACCESS_TOKEN_EXPIRED]: TokenExpiredException,
  [ErrorCode.INVALID_REFRESH_TOKEN]: RefreshTokenInvalidException,
  [ErrorCode.MISSING_AUTHENTICATION]: MissingAuthenticationException,
  [ErrorCode.INVALID_CREDENTIALS]: InvalidCredentialsException,
  // 403 - Forbidden
  [ErrorCode.FORBIDDEN]: AppForbiddenException,
  // 404 - Not Found
  [ErrorCode.NOT_FOUND]: AppNotFoundException,
  [ErrorCode.USER_NOT_FOUND]: UserNotFoundException,
  [ErrorCode.EVENT_NOT_FOUND]: EventNotFoundException,
  // 409 - Conflict
  [ErrorCode.CONFLICT]: AppConflictException,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: EmailAlreadyExistsException,
  [ErrorCode.REFRESH_TOKEN_ALREADY_EXISTS]: RefreshTokenAlreadyExistsException,
  [ErrorCode.EVENT_NOT_DRAFT]: EventNotDraftException,
  [ErrorCode.ZONE_ALREADY_EXISTS]: ZoneAlreadyExistsException,
  // 429 - Too Many Requests
  [ErrorCode.RATE_LIMIT_EXCEEDED]: RateLimitExceededException,
  [ErrorCode.TOO_MANY_REQUESTS]: TooManyRequestsException,
  // 500 - Internal Server Error
  [ErrorCode.INTERNAL_SERVER_ERROR]: InternalServerErrorException,
  [ErrorCode.DATABASE_ERROR]: DatabaseErrorException,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: ExternalServiceErrorException,
} satisfies Record<ErrorCode, new (...args: any[]) => HttpException>;
