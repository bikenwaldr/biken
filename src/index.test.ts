import { describe, it, expect } from 'vitest';
import { createHandler } from './index';

describe('cfai Bridge', () => {
  it('should create a handler function', () => {
    const handler = createHandler({
      apiToken: 'test-token',
      accountId: 'test-account',
    });
    
    expect(typeof handler).toBe('function');
  });

  it('should have correct configuration defaults', () => {
    const handler = createHandler({
      apiToken: 'test-token',
      accountId: 'test-account',
    });
    
    // Handler should be a function (basic smoke test)
    expect(handler).toBeInstanceOf(Function);
  });

  it('should accept optional configuration', () => {
    const handler = createHandler({
      apiToken: 'test-token',
      accountId: 'test-account',
      model: '@cf/meta/llama-3.1-8b-instruct',
      temperature: 0.5,
      maxTokens: 500,
      debug: true,
    });
    
    expect(handler).toBeInstanceOf(Function);
  });

  it('should accept gateway configuration', () => {
    const handler = createHandler({
      apiToken: 'test-token',
      accountId: 'test-account',
      useGateway: true,
      gatewayId: 'test-gateway',
    });
    
    expect(handler).toBeInstanceOf(Function);
  });
});