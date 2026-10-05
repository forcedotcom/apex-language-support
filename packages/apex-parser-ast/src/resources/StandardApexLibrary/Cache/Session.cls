/**
 * Use the Cache.Session class to add, retrieve, and manage values in the session cache. The session cache is active as long as the user’s Salesforce session is valid (the user is logged in, and the session is not expired).
 * <p>Usage
 * Cache Key Format
 * This table lists the format of the key parameter that some methods in this class take, such as put, get, and contains.
 * Key Format Description
 * namespace.partition.key Fully qualified key name.
 * key Refers to a partition marked as default when the namespace.partition prefix is omitted.
 * local.partition.key Use the local prefix to refer to the org’s namespace when the org doesn’t have a namespace defined. If the org has a namespace defined, the local prefix also refers to that org’s namespace.
 * Note
 * If no default partition is specified in the org, calling a cache method without fully qualifying the key name causes a Cache.Session.SessionCacheException to be thrown.
 * The local prefix in an installed managed package refers to the namespace of the subscriber org and not the package’s namespace. The cache put calls are not allowed in a partition that the invoking class doesn’t own.
 * <p>Example
 * This class is the controller for a sample Visualforce page (shown in the subsequent code sample). The cached values are initially added to the cache by the init() method, which the Visualforce page invokes when it loads through the action attribute. The cache keys don’t contain the namespace.partition prefix. They all refer to a default partition in your org. The Visualforce page expects a partition named myPartition. To run this sample, create a default partition in your org with the name myPartition.
 * The Visualforce page contains four output components. The first three components call get methods on the controller that return the following values from the cache: a date, data based on the MyData inner class, and a counter. The next output component uses the $Cache.Session global variable to get the cached string value for the key named output. Next, the $Cache.Session global variable is used again in the Visualforce page to iterate over the elements of a cached value of type List. The size of the list is also returned.
 * The Visualforce page also contains two buttons. The Rerender button invokes the go() method on the controller. This method increases the values of the counter and the custom data in the cache. If you click Rerender, the two counters increase by one each time. The go() method retrieves the values of these counters from the cache, increments their values by one, and stores them again in the cache.
 * The Remove button deletes the date-time value (with key datetime) from the cache. As a result, the value next to Cached datetime: is cleared on the page.
 * public with sharing class SessionCacheController {
 *
 *     // Inner class.
 *     // Used as the data type of a cache value.
 *     public with sharing class MyData {
 *         public String value { get; set; }
 *         public Integer counter { get; set; }
 *
 *         public MyData(String value) {
 *             this.value = value;
 *             this.counter = 0;
 *         }
 *
 *         public void inc() {
 *             counter++;
 *         }
 *
 *         override public String toString() {
 *             return this.value + ':' + this.counter;
 *         }
 *     }
 *
 *     // Apex List.
 *     // Used as the data type of a cached value.
 *     private List<String> numbers =
 *             new List<String> { 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE' };
 *
 *     // Constructor of the controller for the Visualforce page.
 *     public SessionCacheController() {
 *     }
 *
 *     // Adds various values to the cache.
 *     // This method is called when the Visualforce page loads.
 *     public void init() {
 *         // All key values are not qualified by the namespace.partition
 *         // prefix because they use the default partition.
 *
 *         // Add counter to the cache with initial value of 0
 *         //  or increment it if it's already there.
 *         if (!Cache.Session.contains('counter')) {
 *             Cache.Session.put('counter', 0);
 *         } else {
 *             Cache.Session.put('counter', getCounter() + 1);
 *         }
 *
 *         // Add the datetime value to the cache only if it's not already there.
 *         if (!Cache.Session.contains('datetime')) {
 *             DateTime dt = DateTime.now();
 *             Cache.Session.put('datetime', dt);
 *         }
 *
 *         // Add the custom data to the cache only if it's not already there.
 *         if (!Cache.Session.contains('data')) {
 *             Cache.Session.put('data', new MyData('Some custom value'));
 *         }
 *
 *         // Add a list of number to the cache if not already there.
 *         if (!Cache.Session.contains('list')) {
 *             Cache.Session.put('list', numbers);
 *         }
 *
 *         // Add a string value to the cache if not already there.
 *         if (!Cache.Session.contains('output')) {
 *             Cache.Session.put('output', 'Cached text value');
 *         }
 *     }
 *
 *     // Return counter from the cache.
 *     public Integer getCounter() {
 *         return (Integer)Cache.Session.get('counter');
 *     }
 *
 *     // Return datetime value from the cache.
 *     public String getCachedDatetime() {
 *         DateTime dt = (DateTime)Cache.Session.get('datetime');
 *         return dt != null ? dt.format() : null;
 *     }
 *
 *     // Return cached value whose type is the inner class MyData.
 *     public String getCachedData() {
 *         MyData mydata = (MyData)Cache.Session.get('data');
 *         return mydata != null ? mydata.toString() : null;
 *     }
 *
 *     // Method invoked by the Rerender button on the Visualforce page.
 *     // Updates the values of various cached values.
 *     // Increases the values of counter and the MyData counter if those
 *     //   cache values are still in the cache.
 *     public PageReference go() {
 *         // Increase the cached counter value or set it to 0
 *         //  if it's not cached.
 *         if (Cache.Session.contains('counter')) {
 *             Cache.Session.put('counter', getCounter() + 1);
 *         } else {
 *             Cache.Session.put('counter', 0);
 *         }
 *
 *         // Get the custom data value from the cache.
 *         MyData d = (MyData)Cache.Session.get('data');
 *         // Only if the data is already in the cache, update it.
 *         if (Cache.Session.contains('data')) {
 *             d.inc();
 *             Cache.Session.put('data', d);
 *         }
 *
 *         return null;
 *     }
 *
 *     // Method invoked by the Remove button on the Visualforce page.
 *     // Removes the datetime cached value from the session cache.
 *     public PageReference remove() {
 *         Cache.Session.remove('datetime');
 *
 *         return null;
 *     }
 * }
 * This is the Visualforce page that corresponds to the SessionCacheController class.
 * <apex:page controller="SessionCacheController" action="{!init}">
 *
 *     <apex:outputPanel id="output">
 *         <br/>Cached datetime: <apex:outputText value="{!cachedDatetime}"/>
 *         <br/>Cached data: <apex:outputText value="{!cachedData}"/>
 *         <br/>Cached counter: <apex:outputText value="{!counter}"/>
 *         <br/>Output: <apex:outputText value="{!$Cache.Session.local.myPartition.output}"/>
 *         <br/>Repeat: <apex:repeat var="item" value="{!$Cache.Session.local.myPartition.list}">
 *             <apex:outputText value="{!item}"/>&nbsp;
 *         </apex:repeat>
 *         <br/>List size: <apex:outputText value="{!$Cache.Session.local.myPartition.list.size}"/>
 *     </apex:outputPanel>
 *
 *     <br/><br/>
 *     <apex:form >
 *         <apex:commandButton id="go" action="{!go}" value="Rerender" rerender="output"/>
 *         <apex:commandButton id="remove" action="{!remove}" value="Remove datetime Key" rerender="output"/>
 *     </apex:form>
 *
 * </apex:page>
 * This is the output of the page after clicking the Rerender button twice. The counter value could differ in your case if a key named counter was already in the cache before running this sample.
 * Cached datetime:8/11/2015 1:58 PM
 * Cached data:Some custom value:2
 * Cached counter:2
 * Output:Cached text value
 * Repeat:ONE TWO THREE FOUR FIVE
 * List size:5
 */
global class Session {
    global final static Integer MAX_TTL_SECS;

    global Session() { }

    /**
     * Returns true if the session cache contains a cached value corresponding to the specified key.
     * @return true if a cache entry is found. Othewise, false.
     */
    global static Boolean contains(String key) { return false; }

    /**
     * Returns true if the cache contains values for a specified set of keys.
     * <p>Usage
     * The number of input keys cannot exceed the maximum limit of 10.
     * <p>Example
     * In this example, the code checks for the presence of multiple keys on the default partition. It fetches the cache key and the corresponding Boolean value for the key entry from the session cache of the default partition.
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Map<String,Boolean> result = Cache.Session.contains(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('Is Key Present in the cache : ' +  result.get(key));
     * }
     * In this example, the code checks for the presence of multiple keys on different partitions. It fetches the cache key and the corresponding Boolean value for the key entry from the session cache of different partitions.
     * // Assuming there are three partitions p1, p2, p3 with default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'local.p1.key','local.p2.key', 'local.p3.key'};
     * Map<String,Boolean> result = Cache.Session.contains(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('Is Key Present in the cache : +  result.get(key));
     * }
     * @return Returns the cache key and corresponding Boolean value indicating that the key entry exists. The Boolean value is false if the key entry doesn't exist.
     */
    global static Map contains(Set keys) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the cached values corresponding to the specified set of keys from the session cache.
     * <p>Usage
     * The number of input keys cannot exceed the maximum limit of 10.
     * <p>Example
     * Fetch multiple keys from the session cache of the default partition.
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Map<String,Object> result = Cache.Session.get(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     * Fetch multiple keys from the session cache of different partitions.
     * // Assuming there are three partitions p1, p2, p3 with default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'local.p1.key','local.p2.key', 'local.p3.key'};
     * Map<String,Object> result = Cache.Session.get(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     * @return Returns the cache key and corresponding value. Returns null when no corresponding value is found for an input key.
     */
    global static Map get(Set keys) { return null; }

    /**
     * Returns the cached value corresponding to the specified key from the session cache.
     * <p>Usage
     * Because Cache.Session.get() returns an object, we recommend that you cast the returned value to a specific type to facilitate use of the returned value.
     * // Get a cached value
     * Object obj = Cache.Session.get('ns1.partition1.orderDate');
     * // Cast return value to a specific data type
     * DateTime dt2 = (DateTime)obj;
     * If a Cache.Session.get() call doesn’t find the referenced key, it returns null.
     * @return Object The cached value as a generic object type. Cast the returned value to the appropriate type.
     */
    global static Object get(String key) { return null; }

    /**
     * Returns the cached value corresponding to the specified key from the session cache. Use this method if your cached value is a class that implements the CacheBuilder interface.
     * <p>Usage
     * Because Cache.Session.get(cacheBuilder, key) returns an object, cast the returned value to a specific type to facilitate use of the returned value.
     * return ((DateTime)Cache.Session.get(DateCache.class, 'datetime')).format();
     * @return Object The cached value as a generic object type. Cast the returned value to the appropriate type.
     */
    global static Object get(System.Type cacheBuilder, String key) { return null; }

    /**
     * Returns the average item size of all the keys fetched from the session cache, in bytes.
     */
    global static Long getAvgGetSize() { return 0L; }

    /**
     * Returns the average time taken to get a key from the session cache, in nanoseconds.
     */
    global static Long getAvgGetTime() { return 0L; }

    /**
     * Deprecated and available only in API versions 49.0 and earlier. Returns the average item size for keys in the session cache, in bytes.
     */
    global static Long getAvgValueSize() { return 0L; }

    /**
     * Returns the percentage of session cache capacity that has been used.
     * @return Used cache as a percentage number.
     */
    global static Double getCapacity() { return 0.0; }

    /**
     * Returns all keys that are stored in the session cache and visible to the invoking namespace.
     * @return A set containing all cache keys.
     */
    global static Set getKeys() { return null; }

    /**
     * Returns the maximum item size of all the keys fetched from the session cache, in bytes.
     */
    global static Long getMaxGetSize() { return 0L; }

    /**
     * Returns the maximum time taken to get a key from the session cache, in nanoseconds.
     */
    global static Long getMaxGetTime() { return 0L; }

    /**
     * Deprecated and available only in API versions 49.0 and earlier. Returns the maximum item size for keys in the session cache, in bytes.
     */
    global static Long getMaxValueSize() { return 0L; }

    /**
     * Returns the miss rate in the session cache.
     */
    global static Double getMissRate() { return 0.0; }

    /**
     * Returns the name of the default cache partition.
     * @return The name of the default cache partition.
     */
    global static String getName() { return null; }

    /**
     * Returns the total number of keys in the session cache.
     */
    global static Long getNumKeys() { return 0L; }

    /**
     * Returns a partition from the session cache that corresponds to the specified partition name.
     * <p>Example
     * After you get the session partition, you can add and retrieve the partition’s cache values.
     * // Get partition
     * Cache.SessionPartition sessionPart = Cache.Session.getPartition('myNs.myPartition');
     * // Retrieve cache value from the partition
     * if (sessionPart.contains('BookTitle')) {
     *     String cachedTitle = (String)sessionPart.get('BookTitle');
     * }
     *
     * // Add cache value to the partition
     * sessionPart.put('OrderDate', Date.today());
     *
     * // Or use dot notation to call partition methods
     * String cachedAuthor = (String)Cache.Session.getPartition('myNs.myPartition').get('BookAuthor');
     */
    global static cache.SessionPartition getPartition(String partitionName) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the session cache is available for use. The session cache isn’t available when an active session isn’t present, such as in asynchronous Apex or code called by asynchronous Apex. For example, if batch Apex causes an Apex trigger to execute, the session cache isn’t available in the trigger because the trigger runs in asynchronous context.
     * @return true if the session cache is available. Otherwise, false.
     */
    global static Boolean isAvailable() { return false; }

    /**
     * Stores the specified key/value pair as a cached entry in the session cache. The put method can write only to the cache in your org’s namespace.
     */
    global static void put(String key, Object value) { }

    /**
     * Stores the specified key/value pair as a cached entry in the session cache and sets the cached value’s lifetime.
     */
    global static void put(String key, Object value, Integer ttlSecs) { }

    /**
     * Stores the specified key/value pair as a cached entry in the session cache and sets the cached value’s visibility.
     */
    global static void put(String key, Object value, cache.Visibility visibility) { }

    /**
     * Stores the specified key/value pair as a cached entry in the session cache. This method also sets the cached value’s lifetime, visibility, and whether it can be overwritten by another namespace.
     */
    global static void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) { }

    /**
     * Deletes the cached value corresponding to the specified key from the session cache.
     * @return true if the cache value was successfully removed. Otherwise, false.
     */
    global static Boolean remove(String key) { return false; }

    /**
     * Deletes the cached value corresponding to the specified key from the session cache. Use this method if your cached value is a class that implements the CacheBuilder interface.
     * @return true if the cache value was successfully removed. Otherwise, false.
     */
    global static Boolean remove(System.Type cacheBuilder, String key) { return false; }

    global override virtual String toString() { return null; }

    /**
     * An error occurred while adding or retrieving a value in the session cache.
     */
    global virtual class SessionCacheException extends Exception {
        global SessionCacheException() { }

        global SessionCacheException(Exception null) { }

        global SessionCacheException(String msg) { }

        global SessionCacheException(String null, Exception null) { }

        global cache.Session.SessionCacheException clone() { return null; }

        global override virtual Boolean equals(Object o) { return false; }

        /**
         * Returns the cause of the exception as an exception object.
         */
        global override virtual Exception getCause() { return null; }

        global override virtual List getDmlFieldNames(Integer index) { return null; }

        global override virtual List getDmlFields(Integer index) { return null; }

        global override virtual String getDmlId(Integer index) { return null; }

        global override virtual Integer getDmlIndex(Integer index) { return 0; }

        global override virtual String getDmlMessage(Integer index) { return null; }

        global override virtual String getDmlStatusCode(Integer index) { return null; }

        global override virtual System.StatusCode getDmlType(Integer index) { return null; }

        global virtual Map getInaccessibleFields() { return null; }

        global virtual Map getInaccessibleFields(Integer index) { return null; }

        /**
         * Returns the line number from where the exception was thrown.
         */
        global override virtual Integer getLineNumber() { return 0; }

        /**
         * Returns the error message that displays for the user.
         */
        global override virtual String getMessage() { return null; }

        global override virtual Integer getNumDml() { return 0; }

        /**
         * Returns the stack trace of a thrown exception as a string.
         */
        global override virtual String getStackTraceString() { return null; }

        /**
         * Returns the type of exception, such as DmlException, ListException, MathException, and so on.
         */
        global override virtual String getTypeName() { return null; }

        global override virtual Integer hashCode() { return 0; }

        /**
         * Sets the cause for this exception, if one hasn’t already been set.
         */
        global override virtual void initCause(Exception cause) { }

        /**
         * Sets the error message that displays for the user.
         */
        global override virtual void setMessage(String message) { }

        global virtual String toString() { return null; }
    }

    /**
     * An attempt is made to access the cache when the session cache isn’t available.
     */
    global class SessionCacheNoSessionException extends Exception {
        global SessionCacheNoSessionException() { }

        global SessionCacheNoSessionException(Exception null) { }

        global SessionCacheNoSessionException(String msg) { }

        global SessionCacheNoSessionException(String null, Exception null) { }

        global cache.Session.SessionCacheNoSessionException clone() { return null; }

        global override virtual Boolean equals(Object o) { return false; }

        /**
         * Returns the cause of the exception as an exception object.
         */
        global override virtual Exception getCause() { return null; }

        global override virtual List getDmlFieldNames(Integer index) { return null; }

        global override virtual List getDmlFields(Integer index) { return null; }

        global override virtual String getDmlId(Integer index) { return null; }

        global override virtual Integer getDmlIndex(Integer index) { return 0; }

        global override virtual String getDmlMessage(Integer index) { return null; }

        global override virtual String getDmlStatusCode(Integer index) { return null; }

        global override virtual System.StatusCode getDmlType(Integer index) { return null; }

        global virtual Map getInaccessibleFields() { return null; }

        global virtual Map getInaccessibleFields(Integer index) { return null; }

        /**
         * Returns the line number from where the exception was thrown.
         */
        global override virtual Integer getLineNumber() { return 0; }

        /**
         * Returns the error message that displays for the user.
         */
        global override virtual String getMessage() { return null; }

        global override virtual Integer getNumDml() { return 0; }

        /**
         * Returns the stack trace of a thrown exception as a string.
         */
        global override virtual String getStackTraceString() { return null; }

        /**
         * Returns the type of exception, such as DmlException, ListException, MathException, and so on.
         */
        global override virtual String getTypeName() { return null; }

        global override virtual Integer hashCode() { return 0; }

        /**
         * Sets the cause for this exception, if one hasn’t already been set.
         */
        global override virtual void initCause(Exception cause) { }

        /**
         * Sets the error message that displays for the user.
         */
        global override virtual void setMessage(String message) { }

        global virtual String toString() { return null; }
    }
}