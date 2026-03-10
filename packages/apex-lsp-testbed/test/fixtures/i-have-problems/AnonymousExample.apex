// Anonymous Apex example for testing
System.debug('Starting anonymous Apex execution...');

// Test basic variable declarations
String greeting = 'Hello from Anonymous Apex!';
Integer count = 42;
Boolean isActive = true;

System.debug('Greeting: ' + greeting);
System.debug('Count: ' + count);
System.debug('Is Active: ' + isActive);

// Test list operations
List<String> fruits = new List<String>{'Apple', 'Banana', 'Orange'};
System.debug('Fruits list size: ' + fruits.size());

for (String fruit : fruits) {
    System.debug('Fruit: ' + fruit);
}

// Test map operations
Map<String, Integer> fruitCounts = new Map<String, Integer>();
fruitCounts.put('Apple', 10);
fruitCounts.put('Banana', 15);
fruitCounts.put('Orange', 8);

System.debug('Fruit counts: ' + fruitCounts);

// Test conditional logic
if (count > 40) {
    System.debug('Count is greater than 40');
} else {
    System.debug('Count is 40 or less');
}

// Test loop
for (Integer i = 1; i <= 3; i++) {
    System.debug('Loop iteration: ' + i);
}

// Test SOQL query (commented out to avoid DML in anonymous context)
// List<User> users = [SELECT Id, Name FROM User LIMIT 1];
// if (!users.isEmpty()) {
//     System.debug('Current user: ' + users[0].Name);
// }

// Test exception handling
try {
    Integer result = count / 2;
    System.debug('Division result: ' + result);
} catch (Exception e) {
    System.debug('Error occurred: ' + e.getMessage());
}

// Test string manipulation
String upperGreeting = greeting.toUpperCase();
String lowerGreeting = greeting.toLowerCase();
System.debug('Upper: ' + upperGreeting);
System.debug('Lower: ' + lowerGreeting);

// Test date/time operations
DateTime now = DateTime.now();
Date today = Date.today();
System.debug('Current DateTime: ' + now);
System.debug('Today: ' + today);

System.debug('Anonymous Apex execution completed successfully!');