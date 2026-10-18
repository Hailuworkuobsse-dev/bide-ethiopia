export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "HttpError";
  }
}
