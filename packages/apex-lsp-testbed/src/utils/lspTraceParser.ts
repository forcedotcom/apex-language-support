/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export interface LSPMessage {
  timestamp: string;
  type: 'request' | 'response' | 'notification';
  method: string;
  id?: number;
  params?: any;
  result?: any;
  telemetry?: {
    properties?: Record<string, string>;
    measures?: Record<string, number>;
  };
  performance?: {
    duration?: number;
    memory?: {
      total?: number;
      used?: number;
    };
  };
}

export interface LSPRequestResponsePair {
  request: LSPMessage;
  response: LSPMessage | null;
  duration: number | null;
}

export type LSPTraceItem = LSPRequestResponsePair | LSPMessage;

export class LSPTraceParser {
  private static readonly MESSAGE_PATTERNS = {
    // Matches "[Trace - HH:MM:SS AM/PM] Sending request 'method - (id)'"
    REQUEST:
      /^\[Trace - (\d{2}:\d{2}:\d{2} [AP]M)\] Sending request '([^']+) - \((\d+)\)'/,

    // Matches "[Trace - HH:MM:SS AM/PM] Received response 'method - (id)' in Xms"
    RESPONSE:
      /^\[Trace - (\d{2}:\d{2}:\d{2} [AP]M)\] Received response '([^']+) - \((\d+)\)' in (\d+)ms/,

    // Matches "[Trace - HH:MM:SS AM/PM] Received notification 'method'"
    NOTIFICATION:
      /^\[Trace - (\d{2}:\d{2}:\d{2} [AP]M)\] Received notification '([^']+)'/,

    // Matches log lines with memory information
    MEMORY: /Total Memory \(MB\): (\d+).*Used Memory \(MB\): (\d+)/,

    // Matches JSON content
    JSON_START: /^Params: {/,
    JSON_RESULT: /^Result: {/,
  };

  private pendingRequests: Map<number, LSPRequestResponsePair> = new Map();
  private messages: LSPTraceItem[] = [];
  private lastCompletedRequestPair: LSPRequestResponsePair | null = null;
  private currentJson: string[] = [];
  private parsingJson = false;
  private currentMessageId: number | null = null;
  private currentJsonType: 'params' | 'result' | null = null;
  private nestingLevel = {
    openBraces: 0,
    closeBraces: 0,
    openBrackets: 0,
    closeBrackets: 0,
  };

  /**
   * Parses the LSP trace log content and returns structured message pairs and notifications as top-level items
   * @param logContent The content of the LSP trace log
   * @returns Array of parsed LSP request/response pairs and notifications/telemetry as top-level items
   */
  parse(logContent: string): LSPTraceItem[] {
    this.messages = [];
    this.pendingRequests.clear();
    this.currentJson = [];
    this.parsingJson = false;
    this.currentMessageId = null;
    this.currentJsonType = null;
    const lines = logContent.split('\n');
    for (const line of lines) {
      this.parseLine(line.trim());
    }
    return this.messages;
  }

  private parseLine(line: string) {
    // Skip empty lines
    if (!line.trim()) {
      return;
    }

    // If we're in the middle of parsing JSON content
    if (this.parsingJson) {
      // Add the line to current JSON content
      this.currentJson.push(line);

      // Check if we've reached the end of the JSON object by counting brackets in accumulated content
      const jsonContent = this.currentJson.join('\n');
      const openBraces = (jsonContent.match(/{/g) || []).length;
      const closeBraces = (jsonContent.match(/}/g) || []).length;
      const openBrackets = (jsonContent.match(/\[/g) || []).length;
      const closeBrackets = (jsonContent.match(/\]/g) || []).length;

      if (openBraces === closeBraces && openBrackets === closeBrackets) {
        this.parsingJson = false;
        this.processJsonContent();
        this.currentJsonType = null;
      }
      return;
    }

    // Check for new message patterns
    const requestMatch = line.match(LSPTraceParser.MESSAGE_PATTERNS.REQUEST);
    const responseMatch = line.match(LSPTraceParser.MESSAGE_PATTERNS.RESPONSE);
    const notificationMatch = line.match(
      LSPTraceParser.MESSAGE_PATTERNS.NOTIFICATION,
    );

    if (requestMatch) {
      this.handleRequest(requestMatch);
    } else if (responseMatch) {
      this.handleResponse(responseMatch);
    } else if (notificationMatch) {
      this.handleNotification(notificationMatch);
    } else if (line.trim().startsWith('Params: {')) {
      this.parsingJson = true;
      this.currentJsonType = 'params';
      this.currentJson = [line.trim().replace(/^.*\{/, '{')];
      console.log('Starting params JSON parsing, type:', this.currentJsonType);
    } else if (line.trim().startsWith('Result: {')) {
      this.parsingJson = true;
      this.currentJsonType = 'result';
      this.currentJson = [line.trim().replace(/^.*\{/, '{')];
      console.log('Starting result JSON parsing, type:', this.currentJsonType);
    }
  }

  private handleRequest(match: RegExpMatchArray) {
    const [, timestamp, method, id] = match;
    const messageId = parseInt(id);
    console.log('Handling request:', { messageId, method, timestamp });

    const requestPair: LSPRequestResponsePair = {
      request: {
        timestamp,
        type: 'request',
        method,
        id: messageId,
      },
      response: null,
      duration: null,
    };

    this.pendingRequests.set(messageId, requestPair);
    this.currentMessageId = messageId;
    console.log(
      'Added request to pendingRequests:',
      this.pendingRequests.has(messageId),
    );
  }

  private handleResponse(match: RegExpMatchArray) {
    const [, timestamp, method, id, duration] = match;
    const messageId = parseInt(id);
    console.log('Handling response:', { messageId, method, timestamp });
    const requestPair = this.pendingRequests.get(messageId);

    if (requestPair) {
      requestPair.response = {
        timestamp,
        type: 'response',
        method,
        id: messageId,
      };
      requestPair.duration = parseInt(duration);
      this.messages.push(requestPair);
      this.pendingRequests.delete(messageId);
      this.lastCompletedRequestPair = requestPair;
      console.log('Processed response for request:', messageId);
    } else {
      console.log('No pending request found for response:', messageId);
    }
  }

  private handleNotification([, timestamp, method]: RegExpMatchArray) {
    const notification: LSPMessage = {
      timestamp,
      type: 'notification',
      method,
    };
    this.messages.push(notification);
  }

  private processJsonContent() {
    try {
      console.log('Processing JSON content, type:', this.currentJsonType);
      // Join all lines and clean up the JSON content
      const jsonStr = this.currentJson
        .join('\n')
        .trim()
        // Remove any trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Ensure proper JSON structure
        .replace(/\n\s*}/g, '}');

      const jsonContent = JSON.parse(jsonStr);
      // Attach to pendingRequests if possible
      if (this.currentMessageId !== null) {
        const pending = this.pendingRequests.get(this.currentMessageId);
        if (pending) {
          if (this.currentJsonType === 'params') {
            pending.request.params = jsonContent;
          } else if (this.currentJsonType === 'result') {
            // Try to find the last response in the output array and attach result
            for (let i = this.messages.length - 1; i >= 0; i--) {
              const msg = this.messages[i];
              if ('request' in msg && msg.response) {
                msg.response.result = jsonContent;
                return;
              }
            }
          }
          return;
        }
      }
      // If not found in pendingRequests, try lastCompletedRequestPair for result
      if (
        this.currentJsonType === 'result' &&
        this.lastCompletedRequestPair &&
        this.lastCompletedRequestPair.response
      ) {
        this.lastCompletedRequestPair.response.result = jsonContent;
        return;
      }
      // For notification Params, attach to the most recent notification without params
      if (this.currentJsonType === 'params') {
        for (let i = this.messages.length - 1; i >= 0; i--) {
          const msg = this.messages[i];
          if (
            'type' in msg &&
            msg.type === 'notification' &&
            (msg as LSPMessage).params === undefined
          ) {
            (msg as LSPMessage).params = jsonContent;
            return;
          }
        }
      }
      // Otherwise, fallback to previous logic for notifications
      let target: LSPRequestResponsePair | LSPMessage | undefined;
      if (this.messages.length > 0) {
        for (let i = this.messages.length - 1; i >= 0; i--) {
          const msg = this.messages[i];
          if ('request' in msg) {
            target = msg;
            break;
          } else if (msg.type === 'notification') {
            target = msg;
            break;
          }
        }
      }
      if (target && 'type' in target && target.type === 'notification') {
        (target as LSPMessage).params = jsonContent;
      }
    } catch (e) {
      // Log the error but don't throw - we want to continue processing
      console.error('Failed to parse JSON content:', e);
      // Clear the current JSON content to prevent it from affecting future parsing
      this.currentJson = [];
      this.currentJsonType = null;
    }
  }
}
