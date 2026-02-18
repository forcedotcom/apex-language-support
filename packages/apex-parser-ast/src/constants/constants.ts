/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const DEFAULT_SALESFORCE_VERSION = 260;

/**
 * Default Salesforce version to use if version file cannot be loaded
 */
export const DEFAULT_SALESFORCE_API_VERSION = 66;

/**
 * Standard SObject types that are always valid across Salesforce orgs
 */
export const STANDARD_SOBJECT_TYPES = new Set([
  // Core CRM Objects
  'Account',
  'Contact',
  'Lead',
  'Opportunity',
  'Case',

  // User & Security
  'User',
  'Profile',
  'Role',
  'Group',
  'Queue',
  'PermissionSet',
  'CustomPermission',

  // Custom Objects & Metadata
  'CustomObject',
  'CustomField',
  'CustomTab',
  'CustomApplication',
  'CustomPage',
  'CustomComponent',
  'CustomLabel',
  'CustomMetadata',
  'CustomSetting',
  'CustomType',
  'CustomWebLink',
  'CustomWorkflow',
  'CustomValidationRule',

  // Apex & Development
  'ApexClass',
  'ApexTrigger',
  'ApexPage',
  'ApexComponent',
  'StaticResource',
  'Document',

  // Activities & Communication
  'Task',
  'Event',
  'Note',
  'Attachment',
  'NoteAndAttachment',

  // Content & Files
  'ContentVersion',
  'ContentDocument',
  'ContentDocumentLink',

  // Social & Collaboration
  'FeedItem',
  'FeedComment',
  'CollaborationGroup',
  'CollaborationGroupMember',
  'CollaborationGroupFeed',
  'CollaborationGroupRecord',
  'EntitySubscription',

  // Marketing
  'Campaign',
  'CampaignMember',

  // Products & Commerce
  'Asset',
  'Contract',
  'Order',
  'OrderItem',
  'Pricebook2',
  'PricebookEntry',
  'Product2',
  'Quote',
  'QuoteLineItem',
  'Partner',
  'PartnerRole',

  // Service & Support
  'Entitlement',
  'ServiceContract',
  'WorkOrder',
  'WorkOrderLineItem',

  // Knowledge & Ideas
  'KnowledgeArticle',
  'KnowledgeArticleVersion',
  'Solution',
  'Article',
  'Idea',
  'IdeaComment',
  'Vote',

  // Topics & Categorization
  'Topic',
  'TopicAssignment',

  // Communities & Networks
  'Network',
  'NetworkMember',
  'NetworkModeration',
  'NetworkPageOverride',
  'NetworkSelfRegistration',
  'NetworkUserAccountRecent',
  'NetworkUserHistoryRecent',
  'NetworkActivity',
  'NetworkMemberGroup',
]);
