/**
 * cfai - CopilotKit + Cloudflare AI Bridge
 * The easiest way to use CopilotKit with Cloudflare Workers AI
 * 
 * @author Audrey Klammer
 * @version 0.3.0
 * @license MIT
 */

import { NextRequest, NextResponse } from 'next/server';

// ============= TYPES =============
export interface CfaiConfig {
  apiToken: string;
  accountId: string;
  model?: string;
  useGateway?: boolean;
  gatewayId?: string;
  temperature?: number;
  maxTokens?: number;
  debug?: boolean;
}

export type CloudflareModel = string;

// ============= MODELS =============
export const CLOUDFLARE_MODELS = [
  '@cf/openai/gpt-oss-120b',
  '@cf/openai/gpt-oss-20b',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/meta/llama-3.1-70b-instruct',
  '@cf/meta/llama-3.2-1b-instruct',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
] as const;

export const OPENAI_MODEL_MAPPING: Record<string, CloudflareModel> = {
  'gpt-4o': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'gpt-4': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'gpt-3.5-turbo': '@cf/meta/llama-3.1-8b-instruct-fast',
};

export function selectCloudflareModel(requestedModel?: string): CloudflareModel {
  if (!requestedModel) {
    return '@cf/meta/llama-3.1-8b-instruct-fast';
  }
  return OPENAI_MODEL_MAPPING[requestedModel] || requestedModel;
}

// ============= CLOUDFLARE PROVIDER =============
function createCloudflareProvider(config: CfaiConfig) {
  const baseUrl = config.useGateway && config.gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/workers-ai`
    : `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run`;

  return {
    provider: 'cloudflare',
    baseUrl,
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    }
  };
}

// ============= OPENAI COMPATIBILITY =============
export async function createCloudflareOpenAI(config: CfaiConfig) {
  const openaiModule = await import('openai');
  const OpenAI = openaiModule.default;
  
  const provider = createCloudflareProvider(config);
  const model = selectCloudflareModel(config.model);
  
  // Create proper OpenAI client instance
  const openai = new OpenAI({
    baseURL: provider.baseUrl,
    apiKey: config.apiToken,
    defaultHeaders: provider.headers,
  });
  
  return { openai, model };
}

// ============= RUNTIME HANDLER (MODERN) =============
export function createRuntime(config: CfaiConfig) {
  return async function POST(request: NextRequest) {
    try {
      // Lazy load both runtimes
      const [copilotKitRuntime, openaiModule] = await Promise.all([
        import('@copilotkit/runtime'),
        import('openai')
      ]);
      
      const { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } = copilotKitRuntime;
      const OpenAI = openaiModule.default;
      
      const provider = createCloudflareProvider(config);
      const model = selectCloudflareModel(config.model);
      
      // Create proper OpenAI client instance
      const openai = new OpenAI({
        baseURL: provider.baseUrl,
        apiKey: config.apiToken,
        defaultHeaders: provider.headers,
      });
      
      const runtime = new CopilotRuntime();
      const serviceAdapter = new OpenAIAdapter({ openai, model });
      
      const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: '/api/copilotkit',
      });
      
      return handleRequest(request);
    } catch (error: any) {
      console.error('[cfai] Runtime error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// ============= LEGACY HANDLER =============
export function createHandler(config: CfaiConfig) {
  return async function POST(request: NextRequest) {
    try {
      const provider = createCloudflareProvider(config);
      const body = await request.json();
      
      if (config.debug) {
        console.log('[cfai] Request:', JSON.stringify(body, null, 2));
      }
      
      const model = selectCloudflareModel(body.model || config.model);
      const messages = body.messages || [];
      
      const cfRequest = {
        model,
        messages,
        temperature: body.temperature || config.temperature || 0.7,
        max_tokens: body.max_tokens || config.maxTokens || 2048,
        stream: body.stream || false,
      };
      
      const response = await fetch(`${provider.baseUrl}/${model}`, {
        method: 'POST',
        headers: provider.headers,
        body: JSON.stringify(cfRequest),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[cfai] Cloudflare API error:', error);
        return NextResponse.json({ error }, { status: response.status });
      }
      
      const data = await response.json();
      
      if (config.debug) {
        console.log('[cfai] Response:', JSON.stringify(data, null, 2));
      }
      
      // Transform to OpenAI format
      const openAIResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.result?.response || data.result || '',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
      
      return NextResponse.json(openAIResponse);
    } catch (error: any) {
      console.error('[cfai] Handler error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// ============= HEALTH CHECK =============
export function createHealthCheck(config: CfaiConfig) {
  return async function GET() {
    const provider = createCloudflareProvider(config);
    return NextResponse.json({
      status: 'healthy',
      provider: provider.provider,
      message: 'cfai Bridge API',
      version: '0.3.0',
      features: {
        gateway: config.useGateway || false,
        debug: config.debug || false,
      },
    });
  };
}

export function createOptions() {
  return async function OPTIONS() {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  };
}

// ============= MAIN EXPORT =============
export default createRuntime;

// ============= CONVENIENCE ALIASES =============
export const cfai = createRuntime;
export const cfaiHandler = createHandler;
export const cfaiOptions = createOptions;
export const cfaiHealthCheck = createHealthCheck;

// ============= COMMONJS COMPATIBILITY =============
module.exports = createRuntime;
module.exports.default = createRuntime;
module.exports.cfai = createRuntime;
module.exports.cfaiHandler = createHandler;
module.exports.cfaiOptions = createOptions;
module.exports.cfaiHealthCheck = createHealthCheck;
module.exports.createCloudflareOpenAI = createCloudflareOpenAI;
module.exports.CLOUDFLARE_MODELS = CLOUDFLARE_MODELS;
module.exports.OPENAI_MODEL_MAPPING = OPENAI_MODEL_MAPPING;
module.exports.selectCloudflareModel = selectCloudflareModel;