/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Create a simple URI class to replace vscode.Uri
export class Uri {
  private _fsPath: string;

  constructor(private _uri: string) {
    this._fsPath = this._toFsPath(_uri);
  }

  static parse(uri: string): Uri {
    return new Uri(uri);
  }

  toString(): string {
    return this._uri;
  }

  get fsPath(): string {
    return this._fsPath;
  }

  private _toFsPath(uri: string): string {
    // Simple implementation - in a real scenario would need more robust parsing
    if (uri.startsWith('file://')) {
      let path = uri.substring(7);
      // Handle Windows drive letter
      if (/^\/[a-zA-Z]:/.test(path)) {
        path = path.substring(1);
      }
      return path;
    }
    return uri;
  }
}

// Protocol converters
export const code2ProtocolConverter = (value: Uri): string => {
  if (/^win32/.test(process.platform)) {
    // The *first* : is also being encoded which is not the standard for URI on Windows
    // Here we transform it back to the standard way
    return value.toString().replace('%3A', ':');
  } else {
    return value.toString();
  }
};

export const protocol2CodeConverter = (value: string): Uri => Uri.parse(value);
