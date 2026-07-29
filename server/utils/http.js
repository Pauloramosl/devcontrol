export function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function createHttpError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}
