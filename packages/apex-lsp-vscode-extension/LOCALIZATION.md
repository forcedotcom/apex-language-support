# Localization Guide

This extension supports localization for configuration settings, commands, and UI elements.

## Localization Files

- `package.nls.json` - Default English strings
- `package.nls.{locale}.json` - Language-specific translations (e.g., `package.nls.es.json` for Spanish)

## Supported Languages

- **English** (default) - `package.nls.json`
- **Spanish** - `package.nls.es.json`

## Adding a New Language

To add support for a new language:

1. Create a new file named `package.nls.{locale}.json` where `{locale}` is the language code (e.g., `fr` for French, `de` for German, `ja` for Japanese)

2. Copy the structure from `package.nls.json` and translate all the values

3. Example for French (`package.nls.fr.json`):

```json
{
  "configuration.apex-ls-ts.description": "Configuration du serveur de langage Apex (Typescript)",
  "configuration.apex-ls-ts.enable.description": "Activer le serveur de langage Apex"
  // ... translate all other keys
}
```

## Localization Keys

### Configuration Settings

All configuration setting descriptions use keys with the pattern:

- `configuration.apex-ls-ts.{setting}.description`

### Commands

Command titles use keys with the pattern:

- `commands.apex.{command}.title`

### Views and Containers

UI element titles use keys with the pattern:

- `viewsContainers.{id}.title`

## How It Works

1. VS Code automatically detects the user's language preference
2. If a language-specific file exists (e.g., `package.nls.es.json` for Spanish), it uses those translations
3. If no language-specific file exists, it falls back to the default English strings in `package.nls.json`
4. The `package.json` file uses `%key%` placeholders that get replaced with the appropriate localized strings

## Testing Localization

To test localization:

1. Change your VS Code language setting to a supported language
2. Restart VS Code
3. Check that the configuration settings and commands show in the translated language

## Contributing Translations

When contributing translations:

1. Ensure all keys from `package.nls.json` are present in your translation file
2. Use appropriate terminology for the target language
3. Maintain the same technical accuracy as the English version
4. Test the translation in VS Code to ensure it displays correctly

## Language Codes

Common language codes:

- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `zh-cn` - Simplified Chinese
- `zh-tw` - Traditional Chinese
- `ko` - Korean
- `ru` - Russian
- `pt-br` - Brazilian Portuguese
- `it` - Italian
