/**
 * Vacancy Radar India - Search Provider Adapter Factory
 * Instantiates the matching adapter for a given provider configuration.
 */

import { ProviderType } from '../../models/providerTypes.js';
import { PublicFeedsAdapter } from './publicFeedsAdapter.js';
import { SearxngAdapter } from './searxngAdapter.js';
import { BraveSearchAdapter } from './braveSearchAdapter.js';
import { GoogleSearchAdapter } from './googleSearchAdapter.js';
import { BingSearchAdapter } from './bingSearchAdapter.js';
import { SerpApiAdapter } from './serpApiAdapter.js';
import { CustomRestAdapter } from './customRestAdapter.js';

export class AdapterFactory {
  /**
   * Creates adapter instance matching provider type
   * @param {Object} providerConfig 
   * @returns {import('./baseSearchAdapter.js').BaseSearchAdapter}
   */
  static create(providerConfig) {
    switch (providerConfig.type) {
      case ProviderType.PUBLIC_FEEDS_RSS:
        return new PublicFeedsAdapter(providerConfig);
      case ProviderType.SEARXNG:
        return new SearxngAdapter(providerConfig);
      case ProviderType.BRAVE_SEARCH:
        return new BraveSearchAdapter(providerConfig);
      case ProviderType.GOOGLE_CUSTOM_SEARCH:
        return new GoogleSearchAdapter(providerConfig);
      case ProviderType.BING_WEB_SEARCH:
        return new BingSearchAdapter(providerConfig);
      case ProviderType.SERPAPI:
        return new SerpApiAdapter(providerConfig);
      case ProviderType.CUSTOM_REST_ADAPTER:
      default:
        return new CustomRestAdapter(providerConfig);
    }
  }
}
