export class TranscodeError extends Error {
    public originalError?: Error;

    constructor(message: string, originalError?: Error) {
        super(message + (originalError ? ` (${originalError.message})` : ""));
        if (originalError) this.originalError = originalError;
    }
}
