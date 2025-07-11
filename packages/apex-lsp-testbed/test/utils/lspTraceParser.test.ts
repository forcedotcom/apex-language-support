/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'fs';
import path from 'path';

import { LSPTraceParser } from '../../src/utils/lspTraceParser';

describe('LSPTraceParser', () => {
  let parser: LSPTraceParser;

  beforeEach(() => {
    parser = new LSPTraceParser();
  });

  it('should parse a simple request/response pair', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979,
    "clientInfo": {
        "name": "Visual Studio Code",
        "version": "1.99.3"
    }
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.
Result: {
    "capabilities": {
        "textDocumentSync": 1,
        "hoverProvider": true
    }
}`;

    const result = [...parser.parse(logContent).values()];
    // Should have only one id (1), which will be the response (last message for id=1)
    expect(result).toHaveLength(1);
    const msg = result[0];
    expect(msg).toBeDefined();
    expect(msg.type).toBe('request');
    expect(msg.method).toBe('initialize');
    expect(msg.id).toBe(1);
    expect(msg.result).toBeDefined();
    expect(msg.result.capabilities.textDocumentSync).toBe(1);
  });

  it('should parse notifications and telemetry events', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979
}

[Trace - 10:20:05 AM] Received notification 'telemetry/event'.
Params: {
    "properties": {
        "Feature": "ApexLanguageServerLauncher"
    },
    "measures": {
        "ExecutionTime": 333
    }
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.`;

    const result = [...parser.parse(logContent).values()];
    // Should have two messages: one notification (id=2), one response (id=1)
    expect(result).toHaveLength(2);
    // Find notification by method
    const notif = result.find((item) => item.method === 'telemetry/event');
    expect(notif).toBeDefined();
    if (notif) {
      expect(notif.params).toBeDefined();
      if (!notif.params) {
        throw new Error(
          'Notification params were not attached. Check parser logic.',
        );
      }
      expect(notif.method).toBe('telemetry/event');
      expect(notif.direction).toBe('receive');
      expect(notif.params.properties.Feature).toBe(
        'ApexLanguageServerLauncher',
      );
    }
    // Check response
    const response = result.find((item) => item.method === 'initialize');
    expect(response).toBeDefined();
    expect(response!.type).toBe('request');
    expect(response!.method).toBe('initialize');
    expect(response!.id).toBe(1);
  });

  it('should handle multiple request/response pairs', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.

[Trace - 10:20:06 AM] Sending request 'textDocument/hover - (1)'.
[Trace - 10:20:06 AM] Received response 'textDocument/hover - (1)' in 45ms.`;

    const result = [...parser.parse(logContent).values()];
    // Should have two messages: one for each id (0 and 1), both responses
    expect(result).toHaveLength(2);
    expect(result[0]).toBeDefined();
    expect(result[0].type).toBe('request');
    expect(result[0].method).toBe('initialize');
    expect(result[1]).toBeDefined();
    expect(result[1].type).toBe('request');
    expect(result[1].method).toBe('textDocument/hover');
  });

  it('should handle malformed JSON gracefully', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979,
    "malformed": json
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.`;
    const result = [...parser.parse(logContent).values()];
    const msg = result[0];
    expect(msg).toBeDefined();
    expect(msg.type).toBe('request');
    expect(msg.method).toBe('initialize');
    expect(msg.params).toBeUndefined();
  });

  it('should parse a real trace log and write JSON output', async () => {
    const logPath = path.join(__dirname, '../ls-sample-trace.log.txt');
    const outPath = path.join(__dirname, '../ls-sample-trace.log.json');

    const logContent = fs.readFileSync(logPath, 'utf8');
    const result = parser.parse(logContent);
    // Convert Map to object for JSON output
    const objResult = Object.fromEntries(result.entries());
    fs.writeFileSync(outPath, JSON.stringify(objResult, null, 2), 'utf8');
    // Basic assertion: result is a non-empty Map
    expect(result.size).toBeGreaterThan(0);
    // Optionally, check that all values are LSPMessage-like
    for (const [, msg] of result.entries()) {
      expect(msg).toHaveProperty('type');
      expect(['request', 'response', 'notification']).toContain(msg.type);
      expect(msg).toHaveProperty('method');
    }
  });

  it('should parse a hover request, telemetry notification, and response (real log excerpt)', () => {
    /* eslint-disable max-len */
    const logContent = `
[Trace - 10:23:10 AM] Sending request 'textDocument/hover - (17)'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/FileUtilities.cls"
    },
    "position": {
        "line": 2,
        "character": 28
    }
}

[Trace - 10:23:10 AM] Received notification 'telemetry/event'.
Params: {
    "properties": {
        "Feature": "Hover",
        "Exception": "None"
    },
    "measures": {
        "ExecutionTime": 7
    }
}

[Trace - 10:23:10 AM] Received response 'textDocument/hover - (17)' in 12ms.
Result: {
    "contents": {
        "kind": "markdown",
        "value": "\`\`\`apex\\nString FileUtilities.createFile(String base64data, String filename, String recordId)\\n\`\`\`\\n"
    } 
}`;
    /* eslint-enable max-len */
    const result = parser.parse(logContent);
    // Check request/response (id=1)
    const hoverMsg = result.get(1);
    expect(hoverMsg).toBeDefined();
    expect(hoverMsg!.type).toBe('request');
    expect(hoverMsg!.method).toBe('textDocument/hover');
    expect(hoverMsg!.params).toBeDefined();
    expect(hoverMsg!.params.textDocument.uri).toContain('FileUtilities.cls');
    expect(hoverMsg!.params.position).toEqual({ line: 2, character: 28 });
    // Check response (should be the same id, type 'request', and have result)
    expect(hoverMsg!.result).toBeDefined();
    expect(hoverMsg!.result.contents.kind).toBe('markdown');
    expect(hoverMsg!.result.contents.value).toContain(
      'FileUtilities.createFile',
    );
    // Check notification (should be id=2)
    const notif = result.get(2);
    expect(notif).toBeDefined();
    expect(notif!.method).toBe('telemetry/event');
    expect(notif!.params).toBeDefined();
    expect(notif!.params.properties.Feature).toBe('Hover');
    expect(notif!.params.measures.ExecutionTime).toBe(7);
  });

  it('should parse textDocument notifications correctly', () => {
    /* eslint-disable max-len */
    const logContent = `
[Trace - 10:20:09 AM] Sending notification 'textDocument/didClose'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestSampleDataController.cls"
    }
}

[Trace - 10:20:09 AM] Received notification 'textDocument/publishDiagnostics'.
Params: {
    "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestSampleDataController.cls",
    "diagnostics": []
}

[Trace - 10:20:09 AM] Sending notification 'textDocument/didOpen'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls",
        "languageId": "apex",
        "version": 1,
        "text": "@isTest\\nprivate class TestPropertyController {\\n    private final static String MOCK_PICTURE_NAME = 'MockPictureName';\\n\\n    public static void createProperties(Integer amount) {\\n        List<Property__c> properties = new List<Property__c>();\\n        for (Integer i = 0; i < amount; i++) {\\n            properties.add(\\n                new Property__c(\\n                    Name = 'Name ' + i,\\n                    Price__c = 20000,\\n                    Beds__c = 3,\\n                    Baths__c = 3\\n                )\\n            );\\n        }\\n        insert properties;\\n    }\\n\\n    @isTest\\n    static void testGetPagedPropertyList() {\\n        Profile standardUserProfile = [\\n            SELECT Name, Id\\n            FROM Profile\\n            WHERE\\n                UserType = 'Standard'\\n                AND PermissionsPrivacyDataAccess = FALSE\\n                AND PermissionsSubmitMacrosAllowed = TRUE\\n                AND PermissionsMassInlineEdit = TRUE\\n            LIMIT 1\\n        ];\\n        User testUser = new User(\\n            Alias = 'standt',\\n            Email = 'standarduser@testorg.com',\\n            EmailEncodingKey = 'UTF-8',\\n            LastName = 'Testing',\\n            LanguageLocaleKey = 'en_US',\\n            LocaleSidKey = 'en_US',\\n            ProfileId = standardUserProfile.Id,\\n            TimeZoneSidKey = 'America/Los_Angeles',\\n            UserName = 'standarduser@dreamhouse-testorg.com'\\n        );\\n        insert testUser;\\n        PermissionSet ps = [\\n            SELECT Id\\n            FROM PermissionSet\\n            WHERE Name = 'dreamhouse'\\n        ];\\n        insert new PermissionSetAssignment(\\n            AssigneeId = testUser.Id,\\n            PermissionSetId = ps.Id\\n        );\\n\\n        // Insert test properties as admin\\n        System.runAs(new User(Id = UserInfo.getUserId())) {\\n            TestPropertyController.createProperties(5);\\n        }\\n        // Read properties as test user\\n        System.runAs(testUser) {\\n            Test.startTest();\\n            PagedResult result = PropertyController.getPagedPropertyList(\\n                '',\\n                999999,\\n                0,\\n                0,\\n                10,\\n                1\\n            );\\n            Test.stopTest();\\n            Assert.areEqual(5, result.records.size());\\n        }\\n    }\\n\\n    @isTest\\n    static void testGetPicturesNoResults() {\\n        Property__c property = new Property__c(Name = 'Name');\\n        insert property;\\n\\n        Test.startTest();\\n        List<ContentVersion> items = PropertyController.getPictures(\\n            property.Id\\n        );\\n        Test.stopTest();\\n\\n        Assert.isNull(items);\\n    }\\n\\n    @isTest\\n    static void testGetPicturesWithResults() {\\n        Property__c property = new Property__c(Name = 'Name');\\n        insert property;\\n\\n        // Insert mock picture\\n        ContentVersion picture = new Contentversion();\\n        picture.Title = MOCK_PICTURE_NAME;\\n        picture.PathOnClient = 'picture.png';\\n        picture.Versiondata = EncodingUtil.base64Decode('MockValue');\\n        insert picture;\\n\\n        // Link picture to property record\\n        List<ContentDocument> documents = [\\n            SELECT Id, Title, LatestPublishedVersionId\\n            FROM ContentDocument\\n            LIMIT 1\\n        ];\\n        ContentDocumentLink link = new ContentDocumentLink();\\n        link.LinkedEntityId = property.Id;\\n        link.ContentDocumentId = documents[0].Id;\\n        link.shareType = 'V';\\n        insert link;\\n\\n        Test.startTest();\\n        List<ContentVersion> items = PropertyController.getPictures(\\n            property.Id\\n        );\\n        Test.stopTest();\\n\\n        Assert.areEqual(1, items.size());\\n        Assert.areEqual(MOCK_PICTURE_NAME, items[0].Title);\\n    }\\n}\\n"
    }
}`;
    /* eslint-enable max-len */
    const result = [...parser.parse(logContent).values()];
    expect(result).toHaveLength(3);

    // Check didClose notification
    const didClose = result.find(
      (msg) => msg.method === 'textDocument/didClose',
    );
    expect(didClose).toBeDefined();
    expect(didClose?.type).toBe('notification');
    expect(didClose?.direction).toBe('send');
    expect(didClose?.params.textDocument.uri).toContain(
      'TestSampleDataController.cls',
    );

    // Check publishDiagnostics notification
    const publishDiagnostics = result.find(
      (msg) => msg.method === 'textDocument/publishDiagnostics',
    );
    expect(publishDiagnostics).toBeDefined();
    expect(publishDiagnostics?.type).toBe('notification');
    expect(publishDiagnostics?.direction).toBe('receive');
    expect(publishDiagnostics?.params.uri).toContain(
      'TestSampleDataController.cls',
    );
    expect(publishDiagnostics?.params.diagnostics).toEqual([]);

    // Check didOpen notification
    const didOpen = result.find((msg) => msg.method === 'textDocument/didOpen');
    expect(didOpen).toBeDefined();
    expect(didOpen?.type).toBe('notification');
    expect(didOpen?.direction).toBe('send');
    expect(didOpen?.params.textDocument.uri).toContain(
      'TestPropertyController.cls',
    );
    expect(didOpen?.params.textDocument.languageId).toBe('apex');
    expect(didOpen?.params.textDocument.version).toBe(1);
    expect(didOpen?.params.textDocument.text).toBeDefined();
  });

  it('should parse array responses correctly', () => {
    const logContent = `
[Trace - 10:20:08 AM] Sending request 'textDocument/documentSymbol - (3)'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/PropertyController.cls"
    }
}

[Trace - 10:20:08 AM] Received response 'textDocument/documentSymbol - (3)' in 61ms.
Result: [
    {
        "name": "PropertyController",
        "kind": 5,
        "range": {
            "start": {
                "line": 0,
                "character": 26
            },
            "end": {
                "line": 111,
                "character": 1
            }
        },
        "selectionRange": {
            "start": {
                "line": 0,
                "character": 26
            },
            "end": {
                "line": 0,
                "character": 44
            }
        },
        "children": [
            {
                "name": "DEFAULT_MAX_PRICE : Decimal",
                "kind": 8,
                "range": {
                    "start": {
                        "line": 1,
                        "character": 33
                    },
                    "end": {
                        "line": 1,
                        "character": 50
                    }
                },
                "selectionRange": {
                    "start": {
                        "line": 1,
                        "character": 33
                    },
                    "end": {
                        "line": 1,
                        "character": 50
                    }
                }
            }
        ]
    }
]`;

    const result = [...parser.parse(logContent).values()];
    expect(result).toHaveLength(1);
    const msg = result[0];
    expect(msg).toBeDefined();
    expect(msg.type).toBe('request');
    expect(msg.method).toBe('textDocument/documentSymbol');
    expect(msg.id).toBe(1);
    expect(Array.isArray(msg.result)).toBe(true);
    expect(msg.result).toHaveLength(1);
    expect(msg.result[0].name).toBe('PropertyController');
    expect(msg.result[0].kind).toBe(5);
    expect(msg.result[0].children).toHaveLength(1);
    expect(msg.result[0].children[0].name).toBe('DEFAULT_MAX_PRICE : Decimal');
  });

  it('should parse a sequence of real LSP trace records', () => {
    /* eslint-disable max-len */
    const logContent = `
[Trace - 10:20:09 AM] Sending notification 'textDocument/didOpen'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls",
        "languageId": "apex",
        "version": 1,
        "text": "@isTest\\nprivate class TestPropertyController {\\n    private final static String MOCK_PICTURE_NAME = 'MockPictureName';\\n\\n    public static void createProperties(Integer amount) {\\n        List<Property__c> properties = new List<Property__c>();\\n        for (Integer i = 0; i < amount; i++) {\\n            properties.add(\\n                new Property__c(\\n                    Name = 'Name ' + i,\\n                    Price__c = 20000,\\n                    Beds__c = 3,\\n                    Baths__c = 3\\n                )\\n            );\\n        }\\n        insert properties;\\n    }\\n\\n    @isTest\\n    static void testGetPagedPropertyList() {\\n        Profile standardUserProfile = [\\n            SELECT Name, Id\\n            FROM Profile\\n            WHERE\\n                UserType = 'Standard'\\n                AND PermissionsPrivacyDataAccess = FALSE\\n                AND PermissionsSubmitMacrosAllowed = TRUE\\n                AND PermissionsMassInlineEdit = TRUE\\n            LIMIT 1\\n        ];\\n        User testUser = new User(\\n            Alias = 'standt',\\n            Email = 'standarduser@testorg.com',\\n            EmailEncodingKey = 'UTF-8',\\n            LastName = 'Testing',\\n            LanguageLocaleKey = 'en_US',\\n            LocaleSidKey = 'en_US',\\n            ProfileId = standardUserProfile.Id,\\n            TimeZoneSidKey = 'America/Los_Angeles',\\n            UserName = 'standarduser@dreamhouse-testorg.com'\\n        );\\n        insert testUser;\\n        PermissionSet ps = [\\n            SELECT Id\\n            FROM PermissionSet\\n            WHERE Name = 'dreamhouse'\\n        ];\\n        insert new PermissionSetAssignment(\\n            AssigneeId = testUser.Id,\\n            PermissionSetId = ps.Id\\n        );\\n\\n        // Insert test properties as admin\\n        System.runAs(new User(Id = UserInfo.getUserId())) {\\n            TestPropertyController.createProperties(5);\\n        }\\n        // Read properties as test user\\n        System.runAs(testUser) {\\n            Test.startTest();\\n            PagedResult result = PropertyController.getPagedPropertyList(\\n                '',\\n                999999,\\n                0,\\n                0,\\n                10,\\n                1\\n            );\\n            Test.stopTest();\\n            Assert.areEqual(5, result.records.size());\\n        }\\n    }\\n\\n    @isTest\\n    static void testGetPicturesNoResults() {\\n        Property__c property = new Property__c(Name = 'Name');\\n        insert property;\\n\\n        Test.startTest();\\n        List<ContentVersion> items = PropertyController.getPictures(\\n            property.Id\\n        );\\n        Test.stopTest();\\n\\n        Assert.isNull(items);\\n    }\\n\\n    @isTest\\n    static void testGetPicturesWithResults() {\\n        Property__c property = new Property__c(Name = 'Name');\\n        insert property;\\n\\n        // Insert mock picture\\n        ContentVersion picture = new Contentversion();\\n        picture.Title = MOCK_PICTURE_NAME;\\n        picture.PathOnClient = 'picture.png';\\n        picture.Versiondata = EncodingUtil.base64Decode('MockValue');\\n        insert picture;\\n\\n        // Link picture to property record\\n        List<ContentDocument> documents = [\\n            SELECT Id, Title, LatestPublishedVersionId\\n            FROM ContentDocument\\n            LIMIT 1\\n        ];\\n        ContentDocumentLink link = new ContentDocumentLink();\\n        link.LinkedEntityId = property.Id;\\n        link.ContentDocumentId = documents[0].Id;\\n        link.shareType = 'V';\\n        insert link;\\n\\n        Test.startTest();\\n        List<ContentVersion> items = PropertyController.getPictures(\\n            property.Id\\n        );\\n        Test.stopTest();\\n\\n        Assert.areEqual(1, items.size());\\n        Assert.areEqual(MOCK_PICTURE_NAME, items[0].Title);\\n    }\\n}\\n"
    }
}

[Trace - 10:20:09 AM] Sending request 'textDocument/documentSymbol - (6)'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls"
    }
}

[Trace - 10:20:09 AM] Received notification 'textDocument/publishDiagnostics'.
Params: {
    "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls",
    "diagnostics": [
        {
            "range": {
                "start": {
                    "line": 8,
                    "character": 16
                },
                "end": {
                    "line": 8,
                    "character": 19
                }
            },
            "severity": 2,
            "message": "Field does not exist: Price__c on Property__c"
        },
        {
            "range": {
                "start": {
                    "line": 8,
                    "character": 16
                },
                "end": {
                    "line": 8,
                    "character": 19
                }
            },
            "severity": 2,
            "message": "Field does not exist: Beds__c on Property__c"
        },
        {
            "range": {
                "start": {
                    "line": 8,
                    "character": 16
                },
                "end": {
                    "line": 8,
                    "character": 19
                }
            },
            "severity": 2,
            "message": "Field does not exist: Baths__c on Property__c"
        }
    ]
}

[Trace - 10:20:09 AM] Received notification 'telemetry/event'.
Params: {
    "properties": {
        "Feature": "Definition",
        "Exception": "None"
    },
    "measures": {
        "ExecutionTime": 0
    }
}

[Trace - 10:20:09 AM] Received response 'textDocument/documentSymbol - (6)' in 50ms.
Result: [
    {
        "name": "TestPropertyController",
        "kind": 5,
        "range": {
            "start": {
                "line": 1,
                "character": 14
            },
            "end": {
                "line": 120,
                "character": 1
            }
        },
        "selectionRange": {
            "start": {
                "line": 1,
                "character": 14
            },
            "end": {
                "line": 1,
                "character": 36
            }
        },
        "children": [
            {
                "name": "MOCK_PICTURE_NAME : String",
                "kind": 8,
                "range": {
                    "start": {
                        "line": 2,
                        "character": 32
                    },
                    "end": {
                        "line": 2,
                        "character": 49
                    }
                },
                "selectionRange": {
                    "start": {
                        "line": 2,
                        "character": 32
                    },
                    "end": {
                        "line": 2,
                        "character": 49
                    }
                }
            },
            {
                "name": "createProperties(Integer) : void",
                "kind": 6,
                "range": {
                    "start": {
                        "line": 4,
                        "character": 23
                    },
                    "end": {
                        "line": 17,
                        "character": 5
                    }
                },
                "selectionRange": {
                    "start": {
                        "line": 4,
                        "character": 23
                    },
                    "end": {
                        "line": 4,
                        "character": 39
                    }
                }
            },
            {
                "name": "testGetPagedPropertyList() : void",
                "kind": 6,
                "range": {
                    "start": {
                        "line": 20,
                        "character": 16
                    },
                    "end": {
                        "line": 71,
                        "character": 5
                    }
                },
                "selectionRange": {
                    "start": {
                        "line": 20,
                        "character": 16
                    },
                    "end": {
                        "line": 20,
                        "character": 40
                    }
                }
            },
            {
                "name": "testGetPicturesNoResults() : void",
                "kind": 6,
                "range": {
                    "start": {
                        "line": 74,
                        "character": 16
                    },
                    "end": {
                        "line": 85,
                        "character": 5
                    }
                },
                "selectionRange": {
                    "start": {
                        "line": 74,
                        "character": 16
                    },
                    "end": {
                        "line": 74,
                        "character": 40
                    }
                }
            },
            {
                "name": "testGetPicturesWithResults() : void",
                "kind": 6,
                "range": {
                    "start": {
                        "line": 88,
                        "character": 16
                    },
                    "end": {
                        "line": 119,
                        "character": 5
                    }
                },
                "selectionRange": {
                    "start": {
                        "line": 88,
                        "character": 16
                    },
                    "end": {
                        "line": 88,
                        "character": 42
                    }
                }
            }
        ]
    }
]

[Trace - 10:20:09 AM] Sending notification 'textDocument/didClose'.
Params: {
    "textDocument": {
        "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls"
    }
}
    
[Trace - 10:20:09 AM] Received notification 'textDocument/publishDiagnostics'.
Params: {
    "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls",
    "diagnostics": []
}
`;
    /* eslint-enable max-len */

    const result = [...parser.parse(logContent).values()];

    // Verify the sequence of messages
    expect(result).toHaveLength(6);

    // Check didOpen notification
    const didOpen = result[0];
    expect(didOpen.type).toBe('notification');
    expect(didOpen.method).toBe('textDocument/didOpen');
    expect(didOpen.direction).toBe('send');
    expect(didOpen.params).toBeDefined();
    expect(didOpen.params.textDocument.uri).toBe(
      'file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls',
    );

    // Check documentSymbol request
    const docSymbol = result[1];
    expect(docSymbol.type).toBe('request');
    expect(docSymbol.method).toBe('textDocument/documentSymbol');
    expect(docSymbol.id).toBe(2);
    expect(docSymbol.params).toBeDefined();
    expect(docSymbol.params.textDocument.uri).toBe(
      'file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls',
    );
    expect(docSymbol.params.textDocument).not.toHaveProperty('diagnostices');
    expect(docSymbol.type).toBe('request');
    expect(docSymbol.method).toBe('textDocument/documentSymbol');
    expect(docSymbol.result).toBeDefined();
    expect(docSymbol.result[0].name).toBe('TestPropertyController');
    expect(docSymbol.result[0].children).toHaveLength(5);

    // Check publishDiagnostics notification
    const diagnostics = result[2];
    expect(diagnostics.type).toBe('notification');
    expect(diagnostics.method).toBe('textDocument/publishDiagnostics');
    expect(diagnostics.direction).toBe('receive');
    expect(diagnostics.params).toBeDefined();
    expect(diagnostics.params.diagnostics).toHaveLength(3);
    expect(diagnostics.params.diagnostics[0].message).toBe(
      'Field does not exist: Price__c on Property__c',
    );

    // Check telemetry notification
    const telemetry = result[3];
    expect(telemetry.type).toBe('notification');
    expect(telemetry.method).toBe('telemetry/event');
    expect(telemetry.direction).toBe('receive');
    expect(telemetry.params).toBeDefined();
    expect(telemetry.params.properties.Feature).toBe('Definition');

    // Check documentSymbol response
    const didClose = result[4];
    expect(didClose.type).toBe('notification');
    expect(didClose.method).toBe('textDocument/didClose');
    expect(didClose.id).toBe(5);
    expect(didClose.params).toBeDefined();
    expect(didClose.params.textDocument.uri).toBe(
      'file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/TestPropertyController.cls',
    );
  });
});
