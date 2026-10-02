/**
 * Contains methods to get locale-specific instances that can be used for comparisons and sorting. Use the getInstance() method to obtain the Collator instance for a given locale and pass the Collator as the Comparator parameter to the list.sort() method.
 * <p>Usage
 * Because locale-sensitive sorting can produce different results depending on the user running the code, avoid using it in triggers or in code that expects a particular sort order.
 * <p>Example
 * This example performs a default list sort and then uses Collator to sort based on the user locale.
 * @IsTest
 *     static void userLocaleSort() {
 *
 *         string userLocale = 'fr_FR';
 *
 *         User u = new User(Alias = 'standt', Email='standarduser@testorg.com',
 *         EmailEncodingKey='UTF-8', LastName='Testing', LanguageLocaleKey='en_US',
 *         LocaleSidKey=userLocale, TimeZoneSidKey='America/Los_Angeles',
 *         ProfileId = [SELECT Id FROM Profile WHERE Name='Standard User'].Id,
 *         UserName='standarduser' + DateTime.now().getTime() + '@testorg.com');
 *
 *         System.runAs(u) {
 *
 *             List<String> shoppingList = new List<String> {
 *                 'épaule désosé Agneau',
 *                 'Juice',
 *                 'à la mélasse Galette 5 kg',
 *                 'Bread',
 *                 'Grocery'
 *             };
 *
 *             // Default sort
 *             shoppingList.sort();
 *             Assert.areEqual('Bread', shoppingList[0]);
 *
 *             // Sort based on user Locale
 *             Collator myCollator = Collator.getInstance();
 *             shoppingList.sort(myCollator);
 *             Assert.areEqual('à la mélasse Galette 5 kg', shoppingList[0]);
 *             Assert.areEqual('Bread', shoppingList[1]);
 *             Assert.areEqual('épaule désosé Agneau', shoppingList[2]);
 *             Assert.areEqual('Grocery', shoppingList[3]);
 *             Assert.areEqual('Juice', shoppingList[4]);
 *         }
 *     }
 */
global class Collator implements System.Comparator {
    /**
     * Perform string comparisons for a given locale.
     */
    global Integer compare(String s1, String s2) { return 0; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets the Collator instance for the current user’s locale.
     */
    global static System.Collator getInstance() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}