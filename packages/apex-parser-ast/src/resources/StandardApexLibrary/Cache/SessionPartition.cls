/**
 * Contains methods to manage cache values in the session cache of a specific partition.
 * Usage
 * This class extends Cache.Partition and inherits all of its non-static methods. Utility methods for creating and validating keys are not supported and can be called only from the Cache.Partition parent class. For a list of Cache.Partition methods, see Partition Methods.
 * To get a session partition, call Cache.Session.getPartition and pass in a fully qualified partition name, as follows.
 * Cache.SessionPartition sessionPartition = Cache.Session.getPartition('namespace.myPartition');
 * See Cache Key Format for Partition Methods.
 * Example
 * This class is the controller for a sample Visualforce page (shown in the subsequent code sample). The controller shows how to use the methods of Cache.SessionPartition to manage a cache value on a particular partition. The controller takes inputs from the Visualforce page for the partition name, key name for a counter, and initial counter value. The controller contains default values for these inputs. When you click Rerender on the Visualforce page, the go() method is invoked and increases the counter by one. When you click Remove Key, the counter key is removed from the cache. The counter value gets reset to its initial value when it’s re-added to the cache.
 * public class SessionPartitionController {
 *
 *    // Name of a partition in the local namespace
 *    String partitionInput = 'local.myPartition';
 *    // Name of the key
 *    String counterKeyInput = 'counter';
 *    // Key initial value
 *    Integer counterInitValue = 0;
 *    // Session partition object
 *    Cache.SessionPartition sessionPartition;
 *
 *     // Constructor of the controller for the Visualforce page.
 *     public SessionPartitionController() {
 *     }
 *
 *     // Adds counter value to the cache.
 *     // This method is called when the Visualforce page loads.
 *     public void init() {
 *         // Create the partition instance based on the partition name
 *         sessionPartition = getPartition();
 *
 *         // Add counter to the cache with an initial value
 *         //  or increment it if it's already there.
 *         if (!sessionPartition.contains(counterKeyInput)) {
 *             sessionPartition.put(counterKeyInput, counterInitValue);
 *         } else {
 *             sessionPartition.put(counterKeyInput, getCounter() + 1);
 *         }
 *     }
 *
 *     // Returns the session partition based on the partition name
 *     // given in the Visualforce page or the default value.
 *     private Cache.SessionPartition getPartition() {
 *        if (sessionPartition == null) {
 *             sessionPartition = Cache.Session.getPartition(partitionInput);
 *        }
 *
 *        return sessionPartition;
 *      }
 *
 *     // Return counter from the cache.
 *     public Integer getCounter() {
 *         return (Integer)getPartition().get(counterKeyInput);
 *     }
 *
 *     // Invoked by the Submit button to save input values
 *     //  supplied by the user.
 *     public PageReference save() {
 *         // Reset the initial key value in the cache
 *         getPartition().put(counterKeyInput, counterInitValue);
 *
 *         return null;
 *     }
 *
 *     // Method invoked by the Rerender button on the Visualforce page.
 *     // Updates the values of various cached values.
 *     // Increases the values of counter and the MyData counter if those
 *     //   cache values are still in the cache.
 *     public PageReference go() {
 *         // Get the partition object
 *         sessionPartition = getPartition();
 *         // Increase the cached counter value or set it to 0
 *         //  if it's not cached.
 *         if (sessionPartition.contains(counterKeyInput)) {
 *             sessionPartition.put(counterKeyInput, getCounter() + 1);
 *         } else {
 *             sessionPartition.put(counterKeyInput, counterInitValue);
 *         }
 *
 *         return null;
 *     }
 *
 *     // Method invoked by the Remove button on the Visualforce page.
 *     // Removes the datetime cached value from the session cache.
 *     public PageReference remove() {
 *         getPartition().remove(counterKeyInput);
 *
 *         return null;
 *     }
 *
 *     // Get and set methods for accessing variables
 *     // that correspond to the input text fields on
 *     // the Visualforce page.
 *     public String getPartitionInput() {
 *         return partitionInput;
 *     }
 *
 *     public String getCounterKeyInput() {
 *         return counterKeyInput;
 *     }
 *
 *     public Integer getCounterInitValue() {
 *         return counterInitValue;
 *     }
 *
 *     public void setPartitionInput(String partition) {
 *         this.partitionInput = partition;
 *     }
 *
 *     public void setCounterKeyInput(String keyName) {
 *         this.counterKeyInput = keyName;
 *     }
 *
 *     public void setCounterInitValue(Integer counterValue) {
 *         this.counterInitValue = counterValue;
 *     }
 * }
 * This is the Visualforce page that corresponds to the SessionPartitionController class.
 * <apex:page controller="SessionPartitionController" action="{!init}">
 *
 *     <apex:form >
 *         <br/>Partition with Namespace Prefix: <apex:inputText value="{!partitionInput}"/>
 *         <br/>Counter Key Name: <apex:inputText value="{!counterKeyInput}"/>
 *         <br/>Counter Initial Value: <apex:inputText value="{!counterInitValue}"/>
 *         <apex:commandButton action="{!save}" value="Save Key Input Values"/>
 *     </apex:form>
 *
 *     <apex:outputPanel id="output">
 *         <br/>Cached Counter: <apex:outputText value="{!counter}"/>
 *     </apex:outputPanel>
 *
 *     <br/>
 *     <apex:form >
 *         <apex:commandButton id="go" action="{!go}" value="Rerender" rerender="output"/>
 *         <apex:commandButton id="remove" action="{!remove}" value="Remove Key" rerender="output"/>
 *     </apex:form>
 *
 * </apex:page>
 */
global virtual class SessionPartition extends cache.Partition {
    global SessionPartition(String fullyQualifiedPartitionName) { }

    global Boolean contains(String key) { return false; }

    global Map contains(Set keys) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Map get(Set keys) { return null; }

    global Object get(String key) { return null; }

    global Object get(System.Type cacheBuilder, String key) { return null; }

    global Long getAvgGetSize() { return 0L; }

    global Long getAvgGetTime() { return 0L; }

    global Long getAvgValueSize() { return 0L; }

    global Double getCapacity() { return 0.0; }

    global Set getKeys() { return null; }

    global Long getMaxGetSize() { return 0L; }

    global Long getMaxGetTime() { return 0L; }

    global Long getMaxValueSize() { return 0L; }

    global Double getMissRate() { return 0.0; }

    global String getName() { return null; }

    global Long getNumKeys() { return 0L; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isAvailable() { return false; }

    global void put(String key, Object value) { }

    global void put(String key, Object value, Integer ttlSecs) { }

    global void put(String key, Object value, cache.Visibility visibility) { }

    global void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) { }

    global Boolean remove(String key) { return false; }

    global Boolean remove(System.Type cacheBuilder, String key) { return false; }

    global override virtual String toString() { return null; }
}