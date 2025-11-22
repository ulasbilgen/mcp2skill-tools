/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  parseCommand,
  camelToSnake,
  snakeToCamel,
  jsonSchemaToJsType,
  getCommanderType,
  escapeTemplateString,
} from '../src/utils.js';

describe('parseCommand', () => {
  it('should split string command into array', () => {
    expect(parseCommand('npx -y weather-server')).toEqual(['npx', '-y', 'weather-server']);
  });

  it('should return array command as-is', () => {
    expect(parseCommand(['python', 'server.py'])).toEqual(['python', 'server.py']);
  });

  it('should handle single word command', () => {
    expect(parseCommand('python')).toEqual(['python']);
  });

  it('should filter out empty strings', () => {
    expect(parseCommand('python  server.py')).toEqual(['python', 'server.py']);
  });
});

describe('camelToSnake', () => {
  it('should convert camelCase to snake_case', () => {
    expect(camelToSnake('getWeather')).toBe('get_weather');
    expect(camelToSnake('fetchData')).toBe('fetch_data');
  });

  it('should convert PascalCase to snake_case', () => {
    expect(camelToSnake('GetWeather')).toBe('get_weather');
  });

  it('should handle consecutive uppercase letters', () => {
    expect(camelToSnake('HTTPRequest')).toBe('http_request');
    expect(camelToSnake('XMLParser')).toBe('xml_parser');
  });

  it('should handle single word', () => {
    expect(camelToSnake('simple')).toBe('simple');
    expect(camelToSnake('SIMPLE')).toBe('simple');
  });

  it('should handle already snake_case', () => {
    expect(camelToSnake('already_snake')).toBe('already_snake');
  });
});

describe('snakeToCamel', () => {
  it('should convert snake_case to camelCase', () => {
    expect(snakeToCamel('get_weather')).toBe('getWeather');
    expect(snakeToCamel('fetch_data')).toBe('fetchData');
  });

  it('should handle single word', () => {
    expect(snakeToCamel('simple')).toBe('simple');
  });

  it('should handle multiple underscores', () => {
    expect(snakeToCamel('get_weather_data')).toBe('getWeatherData');
  });
});

describe('jsonSchemaToJsType', () => {
  it('should map string type', () => {
    expect(jsonSchemaToJsType({ type: 'string' })).toBe('string');
  });

  it('should map integer to number', () => {
    expect(jsonSchemaToJsType({ type: 'integer' })).toBe('number');
  });

  it('should map number type', () => {
    expect(jsonSchemaToJsType({ type: 'number' })).toBe('number');
  });

  it('should map boolean type', () => {
    expect(jsonSchemaToJsType({ type: 'boolean' })).toBe('boolean');
  });

  it('should map array type', () => {
    expect(jsonSchemaToJsType({ type: 'array' })).toBe('array');
  });

  it('should map object type', () => {
    expect(jsonSchemaToJsType({ type: 'object' })).toBe('object');
  });

  it('should map null type', () => {
    expect(jsonSchemaToJsType({ type: 'null' })).toBe('null');
  });

  it('should default to object if type not specified', () => {
    expect(jsonSchemaToJsType({})).toBe('object');
  });

  it('should return unknown for unrecognized type', () => {
    expect(jsonSchemaToJsType({ type: 'unknown_type' })).toBe('unknown');
  });
});

describe('getCommanderType', () => {
  it('should return number parser for integer', () => {
    const result = getCommanderType({ type: 'integer' });
    expect(result.type).toBe('number');
    expect(result.parser).toBe('parseInt');
  });

  it('should return number parser for number', () => {
    const result = getCommanderType({ type: 'number' });
    expect(result.type).toBe('number');
    expect(result.parser).toBe('parseFloat');
  });

  it('should return boolean type', () => {
    const result = getCommanderType({ type: 'boolean' });
    expect(result.type).toBe('boolean');
    expect(result.parser).toBeNull();
  });

  it('should return array type', () => {
    const result = getCommanderType({ type: 'array' });
    expect(result.type).toBe('array');
    expect(result.parser).toBeNull();
  });

  it('should default to string type', () => {
    const result = getCommanderType({ type: 'string' });
    expect(result.type).toBe('string');
    expect(result.parser).toBeNull();
  });
});

describe('escapeTemplateString', () => {
  it('should escape backticks', () => {
    expect(escapeTemplateString('Hello `world`')).toBe('Hello \\`world\\`');
  });

  it('should escape dollar signs', () => {
    expect(escapeTemplateString('Price: $100')).toBe('Price: \\$100');
  });

  it('should escape backslashes', () => {
    expect(escapeTemplateString('Path: C:\\Users')).toBe('Path: C:\\\\Users');
  });

  it('should escape newlines', () => {
    expect(escapeTemplateString('Line 1\nLine 2')).toBe('Line 1\\nLine 2');
  });

  it('should escape carriage returns', () => {
    expect(escapeTemplateString('Line 1\rLine 2')).toBe('Line 1\\rLine 2');
  });

  it('should escape tabs', () => {
    expect(escapeTemplateString('Col1\tCol2')).toBe('Col1\\tCol2');
  });

  it('should handle multiple escape sequences', () => {
    const input = 'Hello `${name}`\nHow are you?';
    const expected = 'Hello \\`\\${name}\\`\\nHow are you?';
    expect(escapeTemplateString(input)).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(escapeTemplateString('')).toBe('');
  });

  it('should handle string without special characters', () => {
    expect(escapeTemplateString('Hello world')).toBe('Hello world');
  });
});

describe('Round-trip conversions', () => {
  it('should round-trip snake_case <-> camelCase', () => {
    const snakeCase = 'get_weather_data';
    const camelCase = snakeToCamel(snakeCase);
    const backToSnake = camelToSnake(camelCase);

    expect(camelCase).toBe('getWeatherData');
    expect(backToSnake).toBe(snakeCase);
  });

  it('should round-trip camelCase -> snake_case -> camelCase', () => {
    const camelCase = 'getUserProfile';
    const snakeCase = camelToSnake(camelCase);
    const backToCamel = snakeToCamel(snakeCase);

    expect(snakeCase).toBe('get_user_profile');
    expect(backToCamel).toBe(camelCase);
  });
});
