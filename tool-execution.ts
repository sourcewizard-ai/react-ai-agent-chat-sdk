export interface ToolExecutionConfig {
  timeoutMs: number;
  retries: number;
  retryDelayMs: number; // initial delay with exponential backoff
}

export class ToolTimeoutError extends Error {
  constructor(toolName: string, timeout: number) {
    super(`Tool "${toolName}" timed out after ${timeout}ms`);
    this.name = 'ToolTimeoutError';
  }
}

export class ToolRetryExhaustedError extends Error {
  constructor(toolName: string, retries: number, lastError: Error) {
    super(`Tool "${toolName}" failed after ${retries} retries. Last error: ${lastError.message}`);
    this.name = 'ToolRetryExhaustedError';
    this.cause = lastError;
  }
}

export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  toolName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ToolTimeoutError(toolName, timeout));
    }, timeout);

    fn()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: ToolExecutionConfig,
  toolName: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry with exponential backoff
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`Retrying ${toolName} (attempt ${attempt + 1}/${config.retries + 1}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await executeWithTimeout(fn, config.timeoutMs, toolName);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Tool ${toolName} failed on attempt ${attempt + 1}:`, lastError.message);

      // Don't retry on timeout errors or if this is the last attempt
      if (error instanceof ToolTimeoutError || attempt === config.retries) {
        break;
      }
    }
  }

  // The AI SDK expects us to throw errors for tool failures
  // But let's try returning a structured error result instead
  const finalError = new ToolRetryExhaustedError(toolName, config.retries, lastError!);
  console.log('THROWING FINAL ERROR:', finalError.message);
  throw finalError;
}
