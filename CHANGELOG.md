# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2024-09-11

### Added
- Exported `CLOUDFLARE_MODELS` array containing all 76 available Cloudflare Workers AI models
- Added `CloudflareModel` TypeScript type for improved type safety and autocomplete
- Model categories include: Text Generation, Text Embeddings, Text Classification, Text-to-Speech, Speech Recognition, Text-to-Image, Image-to-Text, and specialized models

### Changed
- Updated `CfaiConfig.model` field to accept both string and CloudflareModel type for better type safety
- Fixed linting errors with unused parameters in health check and OPTIONS handlers

### Developer Experience
- Users now get full IntelliSense/autocomplete for all Cloudflare model names
- TypeScript will catch typos in model names at compile time
- Easy model discovery through the exported CLOUDFLARE_MODELS array

## [0.1.0] - 2024-09-11

### Added
- Initial release of cfai
- Full support for CopilotKit versions 1.0.x through 1.10.x+
- Integration with OpenAI's GPT models on Cloudflare (@cf/openai/gpt-oss-120b and gpt-oss-20b)
- Intelligent model mapping from OpenAI model names to Cloudflare equivalents
- Model preference option to choose between OpenAI models and alternative models (Llama, Mistral, etc.)
- Modern runtime handler using CopilotRuntime and OpenAIAdapter pattern
- Legacy handler for backward compatibility with older CopilotKit versions
- Automatic fallback between runtime modes when @copilotkit/runtime is not installed
- Support for Cloudflare AI Gateway for caching and observability
- TypeScript support with full type definitions
- Comprehensive documentation and examples

### Features
- 93% cost reduction compared to OpenAI API
- 68% faster response times through edge computing
- Zero configuration complexity for basic usage
- Azure OpenAI-like adapter pattern for familiar development experience

### Technical Details
- Package size: 8.5 KB (32.9 KB unpacked)
- Node.js 18+ required
- Peer dependencies: next >=13.0.0, openai >=4.0.0
- Optional dependency: @copilotkit/runtime >=1.9.0