// src/utils/configValidator.ts
import type { StorageSettings } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ApiKeyValidation {
  isValid: boolean;
  format: 'valid' | 'invalid' | 'unknown';
  suggestions: string[];
}

class ConfigValidator {
  private readonly API_KEY_PATTERN = /^vk-[a-zA-Z0-9]{20,}$/;
  private readonly SUPPORTED_LANGUAGES = new Set([
    'zh', 'zh-Hant', 'en', 'ja', 'ko', 'de', 'fr', 'es', 'it', 'pt', 'ru', 
    'th', 'vi', 'ar', 'cs', 'da', 'fi', 'hr', 'hu', 'id', 'ms', 'nb', 'nl', 
    'pl', 'ro', 'sv', 'tr', 'uk'
  ]);

  validateApiKey(apiKey: string): ApiKeyValidation {
    const result: ApiKeyValidation = {
      isValid: false,
      format: 'unknown',
      suggestions: [],
    };

    if (!apiKey || apiKey.trim().length === 0) {
      result.suggestions.push('API key is required');
      result.format = 'invalid';
      return result;
    }

    const trimmedKey = apiKey.trim();

    if (this.API_KEY_PATTERN.test(trimmedKey)) {
      result.isValid = true;
      result.format = 'valid';
    } else {
      result.format = 'invalid';
      
      if (!trimmedKey.startsWith('vk-')) {
        result.suggestions.push('API key should start with "vk-"');
      }
      
      if (trimmedKey.length < 22) {
        result.suggestions.push('API key appears to be too short');
      }
      
      if (trimmedKey.length > 50) {
        result.suggestions.push('API key appears to be too long');
      }
      
      if (/[^a-zA-Z0-9-]/.test(trimmedKey)) {
        result.suggestions.push('API key contains invalid characters');
      }
    }

    return result;
  }

  validateLanguage(language: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
    };

    if (!language) {
      result.errors.push('Language is required');
      return result;
    }

    if (!this.SUPPORTED_LANGUAGES.has(language)) {
      result.errors.push(`Language "${language}" is not supported`);
      return result;
    }

    result.isValid = true;
    return result;
  }

  validateDisplayMode(mode: string): ValidationResult {
    const validModes = ['bilingual', 'translation-only', 'original'];
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
    };

    if (!mode) {
      result.errors.push('Display mode is required');
      return result;
    }

    if (!validModes.includes(mode)) {
      result.errors.push(`Invalid display mode: "${mode}"`);
      return result;
    }

    result.isValid = true;
    return result;
  }

  validateSettings(settings: Partial<StorageSettings>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate API key
    if (settings.doubaoApiKey) {
      const apiKeyValidation = this.validateApiKey(settings.doubaoApiKey);
      if (!apiKeyValidation.isValid) {
        result.isValid = false;
        result.errors.push('Invalid API key format');
        result.warnings.push(...apiKeyValidation.suggestions);
      }
    } else {
      result.warnings.push('API key is not configured');
    }

    // Validate target language
    if (settings.doubaoTargetLanguage) {
      const languageValidation = this.validateLanguage(settings.doubaoTargetLanguage);
      if (!languageValidation.isValid) {
        result.isValid = false;
        result.errors.push(...languageValidation.errors);
      }
    }

    // Validate display mode
    if (settings.doubaoDisplayMode) {
      const modeValidation = this.validateDisplayMode(settings.doubaoDisplayMode);
      if (!modeValidation.isValid) {
        result.isValid = false;
        result.errors.push(...modeValidation.errors);
      }
    }

    return result;
  }

  getDefaultSettings(): StorageSettings {
    return {
      doubaoApiKey: '',
      doubaoTargetLanguage: 'zh',
      doubaoDisplayMode: 'bilingual',
      extensionEnabled: true,
      autoTranslate: false,
    };
  }

  sanitizeSettings(settings: Partial<StorageSettings>): StorageSettings {
    const defaults = this.getDefaultSettings();
    
    return {
      doubaoApiKey: settings.doubaoApiKey?.trim() || defaults.doubaoApiKey,
      doubaoTargetLanguage: settings.doubaoTargetLanguage || defaults.doubaoTargetLanguage,
      doubaoDisplayMode: settings.doubaoDisplayMode || defaults.doubaoDisplayMode,
      extensionEnabled: settings.extensionEnabled ?? defaults.extensionEnabled,
      autoTranslate: settings.autoTranslate ?? defaults.autoTranslate,
    };
  }

  generateConfigurationReport(settings: StorageSettings): string {
    const validation = this.validateSettings(settings);
    const reportLines: string[] = [];

    reportLines.push('=== Doubao Translator Configuration Report ===');
    reportLines.push(`Generated: ${new Date().toISOString()}`);
    reportLines.push('');

    // API Key Status
    const apiKeyStatus = settings.doubaoApiKey ? 
      this.validateApiKey(settings.doubaoApiKey).isValid ? '✅ Valid' : '❌ Invalid' : 
      '⚠️ Not configured';
    reportLines.push(`API Key: ${apiKeyStatus}`);

    // Language Status
    const languageStatus = settings.doubaoTargetLanguage &&
      this.validateLanguage(settings.doubaoTargetLanguage).isValid ?
      '✅ Valid' : '❌ Invalid';
    reportLines.push(`Target Language: ${settings.doubaoTargetLanguage || 'Not set'} (${languageStatus})`);

    // Display Mode Status
    const modeStatus = settings.doubaoDisplayMode &&
      this.validateDisplayMode(settings.doubaoDisplayMode).isValid ?
      '✅ Valid' : '❌ Invalid';
    reportLines.push(`Display Mode: ${settings.doubaoDisplayMode || 'Not set'} (${modeStatus})`);

    // Extension Status
    reportLines.push(`Extension Enabled: ${settings.extensionEnabled ? '✅ Yes' : '❌ No'}`);
    reportLines.push(`Auto-translate: ${settings.autoTranslate ? '✅ Yes' : '❌ No'}`);

    // Validation Results
    reportLines.push('');
    reportLines.push('=== Validation Results ===');
    if (validation.errors.length > 0) {
      reportLines.push('❌ Errors:');
      validation.errors.forEach(error => reportLines.push(`  - ${error}`));
    } else {
      reportLines.push('✅ No errors found');
    }

    if (validation.warnings.length > 0) {
      reportLines.push('⚠️ Warnings:');
      validation.warnings.forEach(warning => reportLines.push(`  - ${warning}`));
    } else {
      reportLines.push('✅ No warnings found');
    }

    return reportLines.join('\n');
  }
}

export const configValidator = new ConfigValidator();

// Utility function to validate and sanitize settings
export const validateAndSanitizeSettings = (settings: Partial<StorageSettings>): {
  settings: StorageSettings;
  validation: ValidationResult;
} => {
  const sanitized = configValidator.sanitizeSettings(settings);
  const validation = configValidator.validateSettings(sanitized);
  
  return {
    settings: sanitized,
    validation,
  };
};