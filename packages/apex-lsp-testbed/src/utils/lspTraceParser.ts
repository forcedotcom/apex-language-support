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
  notifications: LSPMessage[];
  telemetryEvents: LSPMessage[];
  duration: number | null;
}

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
  private messages: LSPRequestResponsePair[] = [];
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
   * Parses the LSP trace log content and returns structured message pairs
   * @param logContent The content of the LSP trace log
   * @returns Array of parsed LSP request/response pairs with associated notifications and telemetry
   */
  parse(logContent: string): LSPRequestResponsePair[] {
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
      notifications: [],
      telemetryEvents: [],
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
      console.log('Processed response for request:', messageId);
    } else {
      console.log('No pending request found for response:', messageId);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleNotification([_, timestamp, method]: RegExpMatchArray) {
    const notification: LSPMessage = {
      timestamp,
      type: 'notification',
      method,
    };

    // If this is a telemetry notification, handle specially
    if (method === 'telemetry/event') {
      this.handleTelemetryNotification(notification);
    } else {
      // Add to the most recent request if one is pending
      const currentRequest =
        this.currentMessageId !== null
          ? this.pendingRequests.get(this.currentMessageId)
          : null;

      if (currentRequest) {
        currentRequest.notifications.push(notification);
      }
    }
  }

  private handleTelemetryNotification(notification: LSPMessage) {
    const currentRequest =
      this.currentMessageId !== null
        ? this.pendingRequests.get(this.currentMessageId)
        : null;

    if (currentRequest) {
      currentRequest.telemetryEvents.push(notification);
    }
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
      const currentRequest =
        this.currentMessageId !== null
          ? this.pendingRequests.get(this.currentMessageId)
          : null;

      if (currentRequest) {
        console.log('Assigning JSON content to:', this.currentJsonType);
        if (this.currentJsonType === 'params') {
          currentRequest.request.params = jsonContent;
        } else if (
          this.currentJsonType === 'result' &&
          currentRequest.response
        ) {
          currentRequest.response.result = jsonContent;
        }
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
