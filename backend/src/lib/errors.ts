export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public fields?: Record<string, unknown>,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const notFoundError = () => new HttpError(404, "not_found", undefined, "Data not found");