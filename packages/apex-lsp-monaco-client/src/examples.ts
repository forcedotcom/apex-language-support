/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Sample Apex code examples for testing the editor

const examples: Record<string, string> = {
  basic: `
public class HelloWorld {
  private String greeting = 'Hello World';

  public String getGreeting() {
    return greeting;
  }

  public void setGreeting(String value) {
    greeting = value;
  }

  public void printGreeting() {
    System.debug(greeting);
  }
}
  `,

  trigger: `
trigger AccountTrigger on Account (before insert, before update) {
  for (Account acc : Trigger.new) {
    if (acc.Name == null) {
      acc.Name = 'Default Account Name';
    }
    
    if (acc.Industry == null) {
      acc.Industry = 'Technology';
    }
    
    // Ensure account numbers follow the pattern
    if (acc.AccountNumber != null && !acc.AccountNumber.startsWith('A-')) {
      acc.AccountNumber = 'A-' + acc.AccountNumber;
    }
  }
}
  `,

  complex: `
public with sharing class ContactService {
  private static final String EMAIL_REGEX = '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,4}$';
  
  /**
   * Creates a new contact record with validation.
   * 
   * @param firstName The contact's first name
   * @param lastName The contact's last name
   * @param email The contact's email address
   * @return The newly created Contact record
   * @throws IllegalArgumentException if input validation fails
   */
  public static Contact createContact(String firstName, String lastName, String email) {
    validateContactData(firstName, lastName, email);
    
    Contact newContact = new Contact(
      FirstName = firstName,
      LastName = lastName,
      Email = email
    );
    
    try {
      insert newContact;
      return newContact;
    } catch (DmlException e) {
      System.debug(LoggingLevel.ERROR, 'Failed to insert contact: ' + e.getMessage());
      throw new ApplicationException('Failed to create contact: ' + e.getMessage());
    }
  }
  
  /**
   * Validates contact data before creating or updating records.
   * 
   * @param firstName The contact's first name
   * @param lastName The contact's last name
   * @param email The contact's email address
   * @throws IllegalArgumentException if validation fails
   */
  private static void validateContactData(String firstName, String lastName, String email) {
    List<String> errors = new List<String>();
    
    if (String.isBlank(firstName)) {
      errors.add('First name is required');
    }
    
    if (String.isBlank(lastName)) {
      errors.add('Last name is required');
    }
    
    if (String.isBlank(email)) {
      errors.add('Email is required');
    } else if (!Pattern.matches(EMAIL_REGEX, email)) {
      errors.add('Email format is invalid');
    }
    
    // Check for duplicate emails
    List<Contact> existingContacts = [
      SELECT Id 
      FROM Contact 
      WHERE Email = :email 
      LIMIT 1
    ];
    
    if (!existingContacts.isEmpty()) {
      errors.add('Contact with this email already exists');
    }
    
    if (!errors.isEmpty()) {
      throw new IllegalArgumentException(String.join(errors, ', '));
    }
  }
  
  /**
   * Custom exception for application errors.
   */
  public class ApplicationException extends Exception {}
}
  `,
};

/**
 * Loads example Apex code for demonstration purposes
 */
export function loadExampleCode(exampleKey: string): string {
  return examples[exampleKey] || '// No example found for the selected key';
}
