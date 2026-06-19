/**
 * 🤖 TitanBot Advanced AI Service
 * Multi-provider AI integration with intelligent fallback and caching
 * Supports: Anthropic Claude, OpenAI GPT-4, Google Gemini
 */

import { logger } from '../utils/logger.js';

export class AIService {
  constructor(anthropicKey, openaiKey, geminiKey) {
    this.providers = {
      anthropic: {
        key: anthropicKey,
        available: !!anthropicKey,
        model: 'claude-3-5-sonnet-20241022',
        endpoint: 'https://api.anthropic.com/v1/messages',
        priority: 1
      },
      openai: {
        key: openaiKey,
        available: !!openaiKey,
        model: 'gpt-4-turbo-preview',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        priority: 2
      },
      gemini: {
        key: geminiKey,
        available: !!geminiKey,
        model: 'gemini-pro',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        priority: 3
      }
    };

    // Advanced caching system
    this.cache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheTTL = 3600000; // 1 hour

    // Rate limiting
    this.rateLimits = {
      perMinute: parseInt(process.env.AI_REQUESTS_PER_MINUTE) || 10,
      perHour: parseInt(process.env.AI_REQUESTS_PER_HOUR) || 100,
      perDay: parseInt(process.env.AI_REQUESTS_PER_DAY) || 500
    };

    this.requestCounts = new Map();
    this.userLimits = new Map();

    // Analytics
    this.analytics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      providerUsage: {},
      averageResponseTime: 0,
      errors: 0
    };

    logger.info('🤖 AI Service initialized with providers:', 
      Object.entries(this.providers)
        .filter(([_, p]) => p.available)
        .map(([name]) => name)
        .join(', ')
    );
  }

  /**
   * Generate AI response with intelligent provider selection
   */
  async generate(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this._getCacheKey(prompt, options);
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        this.analytics.cacheHits++;
        return cached;
      }
      this.analytics.cacheMisses++;

      // Check rate limits
      if (!this._checkRateLimit(options.userId)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Select best available provider
      const provider = this._selectProvider(options.preferredProvider);
      if (!provider) {
        throw new Error('No AI providers available');
      }

      // Generate response
      const response = await this._callProvider(provider, prompt, options);
      
      // Cache the response
      this._addToCache(cacheKey, response);

      // Update analytics
      this.analytics.totalRequests++;
      this.analytics.providerUsage[provider.name] = 
        (this.analytics.providerUsage[provider.name] || 0) + 1;
      
      const responseTime = Date.now() - startTime;
      this.analytics.averageResponseTime = 
        (this.analytics.averageResponseTime * (this.analytics.totalRequests - 1) + responseTime) / 
        this.analytics.totalRequests;

      return response;

    } catch (error) {
      this.analytics.errors++;
      logger.error('AI generation error:', error);
      throw error;
    }
  }

  /**
   * Summarize text using AI
   */
  async summarize(text, maxLength = 200) {
    const prompt = `Summarize the following text in ${maxLength} characters or less:\n\n${text}`;
    return await this.generate(prompt, { maxTokens: 150 });
  }

  /**
   * Translate text using AI
   */
  async translate(text, targetLanguage) {
    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}`;
    return await this.generate(prompt, { maxTokens: 500 });
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text) {
    const prompt = `Analyze the sentiment of this text and respond with only: positive, negative, or neutral:\n\n${text}`;
    const response = await this.generate(prompt, { maxTokens: 10 });
    return response.toLowerCase().trim();
  }

  /**
   * Generate creative content
   */
  async generateCreative(type, topic, options = {}) {
    const prompts = {
      story: `Write a short creative story about: ${topic}`,
      poem: `Write a poem about: ${topic}`,
      joke: `Tell a funny joke about: ${topic}`,
      fact: `Share an interesting fact about: ${topic}`,
      quote: `Generate an inspirational quote about: ${topic}`
    };

    const prompt = prompts[type] || prompts.fact;
    return await this.generate(prompt, { ...options, maxTokens: 300 });
  }

  /**
   * Moderate content using AI
   */
  async moderateContent(text) {
    const prompt = `Analyze this text for inappropriate content. Respond with JSON: {"safe": true/false, "reason": "explanation", "categories": []}:\n\n${text}`;
    const response = await this.generate(prompt, { maxTokens: 150 });
    
    try {
      return JSON.parse(response);
    } catch {
      return { safe: true, reason: 'Unable to parse moderation result', categories: [] };
    }
  }

  /**
   * Call specific AI provider
   */
  async _callProvider(provider, prompt, options = {}) {
    const maxTokens = options.maxTokens || 500;
    const temperature = options.temperature || 0.7;

    switch (provider.name) {
      case 'anthropic':
        return await this._callAnthropic(provider, prompt, maxTokens, temperature);
      case 'openai':
        return await this._callOpenAI(provider, prompt, maxTokens, temperature);
      case 'gemini':
        return await this._callGemini(provider, prompt, maxTokens, temperature);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  /**
   * Call Anthropic Claude API
   */
  async _callAnthropic(provider, prompt, maxTokens, temperature) {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Call OpenAI GPT API
   */
  async _callOpenAI(provider, prompt, maxTokens, temperature) {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Google Gemini API
   */
  async _callGemini(provider, prompt, maxTokens, temperature) {
    const response = await fetch(`${provider.endpoint}?key=${provider.key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Select best available provider
   */
  _selectProvider(preferred) {
    const available = Object.entries(this.providers)
      .filter(([_, p]) => p.available)
      .sort((a, b) => a[1].priority - b[1].priority);

    if (preferred && this.providers[preferred]?.available) {
      return { name: preferred, ...this.providers[preferred] };
    }

    if (available.length === 0) return null;
    
    const [name, config] = available[0];
    return { name, ...config };
  }

  /**
   * Cache management
   */
  _getCacheKey(prompt, options) {
    return `${prompt}_${JSON.stringify(options)}`;
  }

  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  _addToCache(key, data) {
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Rate limiting
   */
  _checkRateLimit(userId) {
    if (!userId) return true;

    const now = Date.now();
    const userLimits = this.userLimits.get(userId) || {
      minute: { count: 0, reset: now + 60000 },
      hour: { count: 0, reset: now + 3600000 },
      day: { count: 0, reset: now + 86400000 }
    };

    // Reset expired limits
    if (now > userLimits.minute.reset) {
      userLimits.minute = { count: 0, reset: now + 60000 };
    }
    if (now > userLimits.hour.reset) {
      userLimits.hour = { count: 0, reset: now + 3600000 };
    }
    if (now > userLimits.day.reset) {
      userLimits.day = { count: 0, reset: now + 86400000 };
    }

    // Check limits
    if (userLimits.minute.count >= this.rateLimits.perMinute) return false;
    if (userLimits.hour.count >= this.rateLimits.perHour) return false;
    if (userLimits.day.count >= this.rateLimits.perDay) return false;

    // Increment counts
    userLimits.minute.count++;
    userLimits.hour.count++;
    userLimits.day.count++;

    this.userLimits.set(userId, userLimits);
    return true;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.analytics,
      cacheSize: this.cache.size,
      activeUsers: this.userLimits.size,
      providers: Object.entries(this.providers)
        .filter(([_, p]) => p.available)
        .map(([name]) => name)
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('AI cache cleared');
  }
}

export default AIService;

// Made with Bob
