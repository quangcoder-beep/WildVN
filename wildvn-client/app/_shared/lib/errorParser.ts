export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export class ApiError extends Error {
  public status: number;
  public error: string;
  public path: string;

  constructor(data: ErrorResponse) {
    super(data.message);
    this.name = "ApiError";
    this.status = data.status;
    this.error = data.error;
    this.path = data.path;
  }
}
