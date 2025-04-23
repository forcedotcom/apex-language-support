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

  private currentJson: string[] = [];
  private parsingJson = false;
  private currentMessageId: number | null = null;
  private currentJsonType: 'params' | 'result' | null = null;
  private notificationId = -1;
  private result: Map<number, LSPMessage> = new Map();

  /**
   * Parses the LSP trace log content and returns a map of id to LSPMessage.
   * @param logContent The content of the LSP trace log
   * @returns Map<number, LSPMessage>
   */
  parse(logContent: string): Map<number, LSPMessage> {
    this.result = new Map();
    this.currentJson = [];
    this.parsingJson = false;
    this.currentMessageId = null;
    this.currentJsonType = null;
    this.notificationId = -1;
    const lines = logContent.split('\n');
    for (const line of lines) {
      this.parseLine(line.trim());
    }
    return this.result;
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
    } else if (line.trim().startsWith('Result: {')) {
      this.parsingJson = true;
      this.currentJsonType = 'result';
      this.currentJson = [line.trim().replace(/^.*\{/, '{')];
    }
  }

  private handleRequest(match: RegExpMatchArray) {
    const [, timestamp, method, id] = match;
    const messageId = parseInt(id);
    const request: LSPMessage = {
      timestamp,
      type: 'request',
      method,
      id: messageId,
    };
    this.currentMessageId = messageId;
    this.result.set(messageId, request);
  }

  private handleResponse(match: RegExpMatchArray) {
    const [, timestamp, method, id, duration] = match;
    this.currentMessageId = parseInt(id);
    const response: LSPMessage = {
      timestamp,
      type: 'response',
      method,
      id: this.currentMessageId,
      performance: { duration: parseInt(duration) },
    };
    // Always update the result map for this id
    const update = {
      ...this.result.get(this.currentMessageId),
      ...response,
    };

    this.result.set(this.currentMessageId, update);
  }

  private handleNotification([, timestamp, method]: RegExpMatchArray) {
    const notification: LSPMessage = {
      timestamp,
      type: 'notification',
      method,
      id: this.notificationId--,
    };
    this.currentMessageId = notification.id!;
    this.result.set(notification.id!, notification);
  }

  private processJsonContent() {
    try {
      const jsonStr = this.currentJson
        .join('\n')
        .trim()
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/\n\s*}/g, '}');
      const jsonContent = JSON.parse(jsonStr);
      if (this.currentMessageId !== null) {
        const msg = this.result.get(this.currentMessageId);
        if (msg) {
          if (this.currentJsonType === 'params') {
            msg.params = jsonContent;
          } else if (this.currentJsonType === 'result') {
            msg.result = jsonContent;
          }
          this.result.set(this.currentMessageId, msg);
          return;
        }
      }
      // Fallback for notification params: attach to most recent notification without params
      if (this.currentJsonType === 'params') {
        for (const [id, msg] of Array.from(this.result.entries()).reverse()) {
          if (msg.type === 'notification' && msg.params === undefined) {
            msg.params = jsonContent;
            this.result.set(id, msg);
            return;
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON content:', e);
      this.currentJson = [];
      this.currentJsonType = null;
    }
  }
}
